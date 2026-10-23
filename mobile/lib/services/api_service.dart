import 'dart:convert';
import 'dart:async';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:flutter/foundation.dart' show debugPrint;

/// Envuelve las llamadas autenticadas: si el servidor responde 401 la sesión venció (o la cerraron),
/// se limpian las credenciales y se avisa a la app para volver al login en vez de mostrar errores sueltos.
class _ClienteAutenticado {
  const _ClienteAutenticado();

  Future<http.Response> get(Uri url, {Map<String, String>? headers}) async =>
      _revisar(await http.get(url, headers: headers));

  Future<http.Response> post(
    Uri url, {
    Map<String, String>? headers,
    Object? body,
  }) async => _revisar(await http.post(url, headers: headers, body: body));

  Future<http.Response> put(Uri url, {Map<String, String>? headers, Object? body}) async =>
      _revisar(await http.put(url, headers: headers, body: body));

  Future<http.Response> delete(Uri url, {Map<String, String>? headers, Object? body}) async =>
      _revisar(await http.delete(url, headers: headers, body: body));

  Future<http.Response> _revisar(http.Response r) async {
    if (r.statusCode == 401) {
      await ApiService.logout();
      ApiService.onSesionExpirada?.call();
    }
    return r;
  }
}

const _http = _ClienteAutenticado();

class ApiService {
  /// La pantalla raíz lo define para llevar al login cuando la sesión vence.
  static void Function()? onSesionExpirada;

  // Guardar la cookie en almacenamiento cifrado, nunca en texto plano.
  static const _secureStorage = FlutterSecureStorage();
  static const _sessionCookieKey = 'session_cookie';
  static const _savedUsernameKey = 'saved_username';
  static const _savedPasswordKey = 'saved_password';
  static const _keyRecordarUsuario = 'recordar_usuario_activo';
  static const _keyUsuarioRecordado = 'usuario_recordado_login';
  static const _keyPasswordRecordado = 'password_recordado_login';

  // Configuración de URL del Backend:
  // Por defecto apunta al endpoint de producción oficial:
  static const String _defaultUrl = 'https://transito.munijlo.gob.pe/api/v1';
  // Clave compartida con el backend (app.mobileKey): se pasa con --dart-define=MOBILE_KEY=... y no queda en el código.
  static const String _mobileKey = String.fromEnvironment('MOBILE_KEY');
  static const String _configuredUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: _defaultUrl,
  );

  static String get baseUrl {
    var url = _configuredUrl.trim();
    while (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    // Si apunta al dominio oficial y no tiene el sufijo /v1, normalizar automáticamente
    if (url.contains('transito.munijlo.gob.pe') && !url.contains('/api/v1')) {
      if (url.endsWith('/api')) {
        url = '$url/v1';
      } else if (!url.contains('/api')) {
        url = '$url/api/v1';
      }
    }
    return url;
  }
  static String get fileBaseUrl => baseUrl.replaceAll(RegExp(r'/api(/v1)?/?$'), '');
  static const Duration _requestTimeout = Duration(seconds: 20);

  // --- GESTIÓN DE RECORDAR SESIÓN ---
  /// Registra el inicio de sesión exitoso.
  /// - Si recordar == true, almacena usuario y contraseña para autocompletar en el próximo inicio.
  /// - Si recordar == false, borra los datos guardados de autocompletado.
  static Future<void> registrarLoginExitoso(
    String username,
    String password,
    bool recordar,
  ) async {
    final clean = username.trim();
    if (clean.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();

    // Limpia residuo anterior del historial si existiera
    await prefs.remove('historial_usuarios_login');

    // Opción "Recordar mi usuario y contraseña"
    await prefs.setBool(_keyRecordarUsuario, recordar);
    if (recordar) {
      await prefs.setString(_keyUsuarioRecordado, clean);
      await prefs.setString(_keyPasswordRecordado, password);
      try {
        await _secureStorage.write(key: _savedUsernameKey, value: clean);
        await _secureStorage.write(key: _savedPasswordKey, value: password);
      } catch (_) {}
    } else {
      await prefs.remove(_keyUsuarioRecordado);
      await prefs.remove(_keyPasswordRecordado);
      try {
        await _secureStorage.delete(key: _savedUsernameKey);
        await _secureStorage.delete(key: _savedPasswordKey);
      } catch (_) {}
    }
  }

  /// Obtiene la configuración de login (si recordar está activo, el usuario guardado y contraseña)
  static Future<Map<String, dynamic>> obtenerConfiguracionLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final bool recordar = prefs.getBool(_keyRecordarUsuario) ?? false;
    String? usuario = prefs.getString(_keyUsuarioRecordado);
    String? password = prefs.getString(_keyPasswordRecordado);

    if (recordar) {
      if (usuario == null || usuario.isEmpty) {
        try {
          usuario = await _secureStorage.read(key: _savedUsernameKey);
        } catch (_) {}
      }
      if (password == null || password.isEmpty) {
        try {
          password = await _secureStorage.read(key: _savedPasswordKey);
        } catch (_) {}
      }
    }

    return {
      'recordar': recordar,
      'usuario': (recordar && usuario != null && usuario.isNotEmpty)
          ? usuario
          : null,
      'password': (recordar && password != null && password.isNotEmpty)
          ? password
          : null,
    };
  }

  // Métodos de compatibilidad
  static Future<void> saveSavedCredentials(
    String username,
    String password,
  ) async {
    await registrarLoginExitoso(username, password, true);
  }

  static Future<Map<String, String>?> getSavedCredentials() async {
    final conf = await obtenerConfiguracionLogin();
    if (conf['recordar'] == true && conf['usuario'] != null) {
      return {
        'username': conf['usuario'] as String,
        'password': (conf['password'] as String?) ?? '',
      };
    }
    return null;
  }

  static Future<void> clearSavedCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyRecordarUsuario, false);
    await prefs.remove(_keyUsuarioRecordado);
    await prefs.remove(_keyPasswordRecordado);
    try {
      await _secureStorage.delete(key: _savedUsernameKey);
      await _secureStorage.delete(key: _savedPasswordKey);
    } catch (_) {}
  }
  // ----------------------------------------------------

  static String? _cookieEnMemoria;

  static Future<void> precargarSesion() async {
    _cookieEnMemoria = await _secureStorage.read(key: _sessionCookieKey);
  }

  /// Encabezados para cargar fotos y firmas: el servidor las entrega solo con sesión iniciada.
  static Map<String, String> get headersImagen => {
    'X-Mobile-App': 'MJLO-TRANSITO',
    if (_mobileKey.isNotEmpty) 'X-Mobile-Key': _mobileKey,
    if (_cookieEnMemoria != null && _cookieEnMemoria!.isNotEmpty)
      'Cookie': _cookieEnMemoria!,
  };

  /// URL de un archivo guardado en el servidor (foto, firma). Acepta la ruta relativa ('papeletas/abc.jpg')
  /// o la URL completa que arma el servidor, y siempre apunta al servidor que usa la app.
  static String urlArchivo(String ruta) {
    final r = ruta.trim();
    if (r.startsWith('data:')) return r;
    final i = r.indexOf('/api/files/');
    if (i >= 0) {
      return '$baseUrl/files/${r.substring(i + '/api/files/'.length)}';
    }
    if (r.startsWith('http://') || r.startsWith('https://')) return r;
    return '$baseUrl/files/${r.replaceFirst(RegExp(r'^/+'), '')}';
  }

  static Future<Map<String, String>> _getHeaders({bool isJson = true}) async {
    final cookie = await _secureStorage.read(key: _sessionCookieKey);
    _cookieEnMemoria = cookie;
    final headers = <String, String>{
      'X-Mobile-App': 'MJLO-TRANSITO',
      if (_mobileKey.isNotEmpty) 'X-Mobile-Key': _mobileKey,
      if (isJson) 'Content-Type': 'application/json',
      if (cookie != null && cookie.isNotEmpty) 'Cookie': cookie,
    };
    return headers;
  }

  static Future<Map<String, dynamic>> login(
    String username,
    String password,
  ) async {
    final response = await _send(
      () => http.post(
        Uri.parse('$baseUrl/login'),
        headers: {
          'Content-Type': 'application/json',
          'X-Mobile-App': 'MJLO-TRANSITO',
          if (_mobileKey.isNotEmpty) 'X-Mobile-Key': _mobileKey,
        },
        body: jsonEncode({'usuario': username, 'password': password}),
      ),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['status'] == true) {
        final prefs = await SharedPreferences.getInstance();

        final rawCookie = response.headers['set-cookie'];
        if (rawCookie != null) {
          final match = RegExp(r'session_user=[^;]+').firstMatch(rawCookie);
          if (match != null) {
            await _secureStorage.write(
              key: _sessionCookieKey,
              value: match.group(0)!,
            );
            _cookieEnMemoria = match.group(0)!;
          }
        }

        final idPersona =
            data['data']['id_persona'] ?? data['data']['id_trabajador'];
        if (idPersona == null) {
          throw Exception(
            'El backend no devolvió el id_persona del inspector.',
          );
        }
        final int parsedId = idPersona is int
            ? idPersona
            : int.parse(idPersona.toString());

        await prefs.setInt('id_persona', parsedId);
        await prefs.setString('nombres', data['data']['nombres'] ?? '');
        await prefs.setString('apellidos', data['data']['apellidos'] ?? '');
        await prefs.setString('usuario', username);
        await prefs.setString('dni', data['data']['dni']?.toString() ?? '');
        await prefs.setString('cargo', data['data']['cargo']?.toString() ?? '');
        await prefs.setString('unidad_organica', data['data']['unidad_organica']?.toString() ?? '');
        await prefs.setString('uo_siglas', data['data']['uo_siglas']?.toString() ?? '');
        await prefs.setString('email', data['data']['email']?.toString() ?? '');
        await prefs.setString('celular', data['data']['celular']?.toString() ?? '');
        await prefs.setString('direccion', data['data']['direccion']?.toString() ?? '');
        await prefs.setString('tipo_contrato', data['data']['tipo_contrato']?.toString() ?? '');
        await prefs.setString('tipo_inspector', data['data']['tipo_inspector']?.toString() ?? '');
        await prefs.setString('rol', data['data']['rol']?.toString() ?? '');
        await prefs.setString('foto_img', data['data']['foto_img']?.toString() ?? '');
        return data;
      }
    }
    throw Exception(_extractError(response.body, 'Error de autenticación'));
  }

  static Future<int?> getPersonalId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('id_persona');
  }

  /// Cierra la sesión también en el servidor (mejor esfuerzo) y luego borra lo local.
  static Future<void> cerrarSesion() async {
    try {
      await http
          .post(Uri.parse('$baseUrl/logout'), headers: await _getHeaders())
          .timeout(const Duration(seconds: 5));
    } catch (_) {}
    await logout();
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    // Limpiar la sesión completa
    await prefs.remove('id_persona');
    await prefs.remove('nombres');
    await prefs.remove('apellidos');
    await prefs.remove('usuario');
    await prefs.remove('dni');
    await prefs.remove('cargo');
    await prefs.remove('unidad_organica');
    await prefs.remove('uo_siglas');
    await prefs.remove('email');
    await prefs.remove('celular');
    await prefs.remove('direccion');
    await prefs.remove('tipo_contrato');
    await prefs.remove('tipo_inspector');
    await prefs.remove('rol');
    await prefs.remove('foto_img');
    _cookieEnMemoria = null;
    try {
      await _secureStorage.delete(key: _sessionCookieKey);
    } catch (_) {}
  }

  /// Obtiene los datos completos del perfil del inspector activo
  static Future<Map<String, dynamic>> getPerfilInspector() async {
    final prefs = await SharedPreferences.getInstance();
    final localData = <String, dynamic>{
      'id_persona': prefs.getInt('id_persona'),
      'nombres': prefs.getString('nombres') ?? '',
      'apellidos': prefs.getString('apellidos') ?? '',
      'usuario': prefs.getString('usuario') ?? '',
      'dni': prefs.getString('dni') ?? '',
      'cargo': prefs.getString('cargo') ?? '',
      'unidad_organica': prefs.getString('unidad_organica') ?? '',
      'uo_siglas': prefs.getString('uo_siglas') ?? '',
      'email': prefs.getString('email') ?? '',
      'celular': prefs.getString('celular') ?? '',
      'direccion': prefs.getString('direccion') ?? '',
      'tipo_contrato': prefs.getString('tipo_contrato') ?? '',
      'tipo_inspector': prefs.getString('tipo_inspector') ?? '',
      'rol': prefs.getString('rol') ?? '',
      'foto_img': prefs.getString('foto_img') ?? '',
    };

    try {
      final response = await _send(
        () async => http.get(
          Uri.parse('$baseUrl/me'),
          headers: await _getHeaders(),
        ),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        if (json['status'] == true && json['data'] != null) {
          final d = json['data'] as Map<String, dynamic>;
          for (final entry in d.entries) {
            if (entry.value != null) {
              if (entry.value is int) {
                await prefs.setInt(entry.key, entry.value as int);
              } else if (entry.value is String) {
                await prefs.setString(entry.key, entry.value as String);
              }
            }
          }
          return {
            ...localData,
            ...d,
          };
        }
      }
    } catch (_) {}

    return localData;
  }

  static Future<String?> getCargo() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('cargo');
  }

  static Future<String?> getTipoInspector() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('tipo_inspector');
  }

  static Future<bool> esInspectorTecnico() async {
    final prefs = await SharedPreferences.getInstance();
    final cargo = (prefs.getString('cargo') ?? '').toUpperCase();
    final tipo = (prefs.getString('tipo_inspector') ?? '').toUpperCase();
    return cargo.contains('TÉCNICO') || cargo.contains('TECNICO') || tipo == 'TECNICO';
  }

  static Future<bool> esEncargadoDeposito() async {
    final prefs = await SharedPreferences.getInstance();
    final rol = (prefs.getString('rol') ?? '').toUpperCase();
    final cargo = (prefs.getString('cargo') ?? '').toUpperCase();
    final tipo = (prefs.getString('tipo_inspector') ?? '').toUpperCase();
    return rol.contains('DEPÓSITO') ||
        rol.contains('DEPOSITO') ||
        cargo.contains('DEPÓSITO') ||
        cargo.contains('DEPOSITO') ||
        tipo == 'DEPOSITO';
  }

  static Future<List<dynamic>> getPapeletas({
    String? dni,
    String? placa,
  }) async {
    final int? idPersona = await getPersonalId();
    if (idPersona == null) return [];

    final Map<String, dynamic> params = {};
    if (dni == null && placa == null) {
      params['inspector_id'] = idPersona.toString();
    }
    if (dni != null) params['dni'] = dni;
    if (placa != null) params['placa'] = placa;
    final uri = Uri.parse('$baseUrl/papeletas')
        .replace(queryParameters: params);

    final response = await _http
        .get(uri, headers: await _getHeaders(isJson: false))
        .timeout(_requestTimeout);
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'] ?? [];
    }
    throw Exception('Error al cargar historial de papeletas');
  }

  static Future<List<dynamic>> getReportes({String? dni, String? placa}) async {
    final int? idPersona = await getPersonalId();
    if (idPersona == null) return [];

    final Map<String, dynamic> params = {};
    if (dni == null && placa == null) {
      params['inspector_id'] = idPersona.toString();
    }
    if (dni != null) params['dni'] = dni;
    if (placa != null) params['placa'] = placa;
    final uri = Uri.parse('$baseUrl/reportes-intervencion')
        .replace(queryParameters: params);

    final response = await _http
        .get(uri, headers: await _getHeaders(isJson: false))
        .timeout(_requestTimeout);
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'] ?? [];
    }
    throw Exception('Error al cargar historial de reportes');
  }

  /// Endpoint ligero para el dashboard: retorna conteos del día + permiso de papeleta
  static Future<Map<String, dynamic>> getMobileDashboard() async {
    final int? idPersona = await getPersonalId();
    final uri = Uri.parse('$baseUrl/mobile/dashboard').replace(
      queryParameters: {
        if (idPersona != null) 'inspector_id': idPersona.toString(),
        '_': DateTime.now().millisecondsSinceEpoch.toString(),
      },
    );
    final response = await _http
        .get(
          uri,
          headers: {
            ...await _getHeaders(isJson: false),
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        )
        .timeout(const Duration(seconds: 10));
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'] ?? {};
    }
    return {};
  }

  static Future<Map<String, dynamic>?> getOperativoActivo() async {
    final idPersona = await getPersonalId();
    if (idPersona == null) return null;

    final response = await _http
        .get(
          Uri.parse('$baseUrl/operativos/activo/$idPersona'),
          headers: await _getHeaders(isJson: false),
        )
        .timeout(_requestTimeout);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'];
    }
    return null;
  }

  static Future<List<dynamic>> getOperativos() async {
    try {
      final response = await _http
          .get(
            Uri.parse('$baseUrl/operativos'),
            headers: await _getHeaders(isJson: false),
          )
          .timeout(_requestTimeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] ?? [];
      }
    } catch (e) {
      debugPrint('Error al obtener operativos: $e');
    }
    return [];
  }

  static Future<bool> permiteAplicarPapeletaMovil() async {
    final uri = Uri.parse('$baseUrl/mobile/config').replace(
      queryParameters: {'_': DateTime.now().millisecondsSinceEpoch.toString()},
    );
    final response = await _http
        .get(
          uri,
          headers: {
            ...await _getHeaders(isJson: false),
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        )
        .timeout(const Duration(seconds: 6));
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data']?['permite_aplicar_papeleta'] == true;
    }
    return false;
  }

  static Future<Map<String, dynamic>> createPapeleta(
    Map<String, dynamic> data,
  ) async {
    try {
      final op = await getOperativoActivo();
      if (op != null && op['id'] != null) {
        data['id_operativo'] = op['id'];
      }
    } catch (_) {}

    final response = await _http
        .post(
          Uri.parse('$baseUrl/papeletas'),
          headers: await _getHeaders(),
          body: jsonEncode(data),
        )
        .timeout(_requestTimeout);

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception(
      _extractError(response.body, 'Error al registrar papeleta'),
    );
  }

  static Future<Map<String, dynamic>> createReporteIntervencion(
    Map<String, dynamic> data,
  ) async {
    try {
      final op = await getOperativoActivo();
      if (op != null && op['id'] != null) {
        data['id_operativo'] = op['id'];
      }
    } catch (_) {}

    final response = await _http
        .post(
          Uri.parse('$baseUrl/reportes-intervencion'),
          headers: await _getHeaders(),
          body: jsonEncode(data),
        )
        .timeout(_requestTimeout);

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception(_extractError(response.body, 'Error al registrar reporte'));
  }

  static Future<void> uploadFirma(int papeletaId, String firmaBase64) async {
    final response = await _http
        .post(
          Uri.parse('$baseUrl/papeletas/$papeletaId/firma'),
          headers: await _getHeaders(),
          body: jsonEncode({'firmaBase64': firmaBase64, 'estado': 'FIRMADO'}),
        )
        .timeout(_requestTimeout);

    if (response.statusCode != 200) {
      throw Exception(_extractError(response.body, 'Error al subir firma'));
    }
  }

  static Future<List<dynamic>> getTiposInfraccion() async {
    final response = await _http
        .get(
          Uri.parse('$baseUrl/tipos-infraccion'),
          headers: await _getHeaders(isJson: false),
        )
        .timeout(_requestTimeout);
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'] ?? [];
    }
    return [];
  }

  static Future<List<dynamic>> getVehiculos() async {
    final response = await _http
        .get(
          Uri.parse('$baseUrl/vehiculos'),
          headers: await _getHeaders(isJson: false),
        )
        .timeout(_requestTimeout);
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'] ?? [];
    }
    return [];
  }

  static Future<Map<String, dynamic>?> buscarVehiculo(
    String tipo,
    String valor, {
    String? codeZona,
    String? codeOficina,
  }) async {
    final Map<String, String> qParams = {
      'tipo': tipo,
      'valor': valor,
      '_': DateTime.now().millisecondsSinceEpoch.toString(),
    };
    if (codeZona != null && codeZona.isNotEmpty) {
      qParams['codeZona'] = codeZona;
    }
    if (codeOficina != null && codeOficina.isNotEmpty) {
      qParams['codeOficina'] = codeOficina;
    }

    final uri = Uri.parse('$baseUrl/mobile/vehiculos/buscar')
        .replace(queryParameters: qParams);
    final response = await _http
        .get(
          uri,
          headers: {
            ...await _getHeaders(isJson: false),
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        )
        .timeout(_requestTimeout);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final vehicle = data['data'];
      if (vehicle is Map<String, dynamic>) {
        return vehicle;
      }
    }
    return null;
  }

  static Future<Map<String, dynamic>?> getPersonaByDni(String dni) async {
    final response = await _http
        .get(
          Uri.parse('$baseUrl/personas?numeroDocumento=$dni'),
          headers: await _getHeaders(isJson: false),
        )
        .timeout(_requestTimeout);
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List<dynamic> list = data['data'] ?? [];
      if (list.isNotEmpty) {
        return list.first;
      }
    }
    return null;
  }

  static Future<Map<String, dynamic>?> getReniecByDni(String dni) async {
    try {
      final response = await _http
          .get(
            Uri.parse('$baseUrl/pide/reniec/$dni'),
            headers: await _getHeaders(isJson: false),
          )
          .timeout(_requestTimeout);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is Map<String, dynamic>) {
          return data['data'] ?? data;
        }
      }
    } catch (_) {}
    return null;
  }

  static Future<List<dynamic>> getVehiculosByPersonaDni(String dni) async {
    final response = await _http
        .get(
          Uri.parse('$baseUrl/vehiculos/persona/dni?dni=$dni'),
          headers: await _getHeaders(isJson: false),
        )
        .timeout(_requestTimeout);
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'] ?? [];
    }
    return [];
  }

  static String _extractError(String body, String fallback) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        final messages = decoded['messages'];
        if (messages is Map && messages.isNotEmpty) {
          return messages.values.join('\n');
        }
        if (decoded['message'] != null) {
          return decoded['message'].toString();
        }
      }
    } catch (_) {}
    return fallback;
  }

  static Future<http.Response> _send(
    Future<http.Response> Function() request,
  ) async {
    try {
      return await request().timeout(_requestTimeout);
    } on TimeoutException {
      throw Exception(
        'No se pudo conectar con el servidor en $baseUrl. Verifica que tu PC y celular estén en el mismo Wi-Fi y el servidor esté encendido.',
      );
    } catch (_) {
      throw Exception(
        'No se pudo conectar con el servidor. Verifica la conexión y que el backend esté levantado.',
      );
    }
  }

  // ==================== MÓDULO INSPECCIÓN TÉCNICA VEHICULAR (CERTICAV) ====================

  /// Obtiene la lista de vehículos FORMALES para inspección técnica
  static Future<List<Map<String, dynamic>>> getVehiculosFormales({
    String? buscar,
    int page = 1,
    int porPagina = 30,
  }) async {
    final Map<String, String> queryParams = {
      'page': page.toString(),
      'porPagina': porPagina.toString(),
    };
    if (buscar != null && buscar.trim().isNotEmpty) {
      queryParams['buscar'] = buscar.trim();
    }

    final uri = Uri.parse('$baseUrl/mobile/vehiculos-formales').replace(
      queryParameters: queryParams,
    );
    final response = await _send(() async => _http.get(uri, headers: await _getHeaders()));

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      if (json['data'] is List) {
        return List<Map<String, dynamic>>.from(json['data']);
      }
    }
    return [];
  }

  /// Obtiene los criterios oficiales de inspección CERTICAV
  static Future<List<Map<String, dynamic>>> getInspeccionCriterios() async {
    final uri = Uri.parse('$baseUrl/mobile/inspeccion-criterios');
    final response = await _send(() async => _http.get(uri, headers: await _getHeaders()));

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      if (json['data'] is List) {
        return List<Map<String, dynamic>>.from(json['data']);
      }
    }
    return [];
  }

  /// Registra la inspección técnica
  static Future<Map<String, dynamic>> enviarInspeccionTecnica(
    Map<String, dynamic> data,
  ) async {
    final uri = Uri.parse('$baseUrl/mobile/inspecciones');
    final response = await _send(
      () async => _http.post(
        uri,
        headers: await _getHeaders(isJson: true),
        body: jsonEncode(data),
      ),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final json = jsonDecode(response.body);
      return json;
    }

    throw Exception(_extractError(response.body, 'No se pudo enviar la inspección técnica.'));
  }

  /// Modifica una inspección técnica existente
  static Future<Map<String, dynamic>> modificarInspeccionTecnica(
    int inspeccionId,
    Map<String, dynamic> data,
  ) async {
    final uri = Uri.parse('$baseUrl/mobile/inspecciones/$inspeccionId');
    final response = await _send(
      () async => _http.put(
        uri,
        headers: await _getHeaders(isJson: true),
        body: jsonEncode(data),
      ),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return json;
    }

    throw Exception(_extractError(response.body, 'No se pudo modificar la inspección técnica.'));
  }

  /// Modifica una papeleta
  static Future<Map<String, dynamic>> modificarPapeleta(
    int papeletaId,
    Map<String, dynamic> data,
  ) async {
    final uri = Uri.parse('$baseUrl/mobile/papeletas/$papeletaId');
    final response = await _send(
      () async => _http.put(
        uri,
        headers: await _getHeaders(isJson: true),
        body: jsonEncode(data),
      ),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return json;
    }

    throw Exception(_extractError(response.body, 'No se pudo modificar la papeleta.'));
  }

  /// Modifica un reporte de intervención
  static Future<Map<String, dynamic>> modificarReporte(
    int reporteId,
    Map<String, dynamic> data,
  ) async {
    final uri = Uri.parse('$baseUrl/mobile/reportes-intervencion/$reporteId');
    final response = await _send(
      () async => _http.put(
        uri,
        headers: await _getHeaders(isJson: true),
        body: jsonEncode(data),
      ),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return json;
    }

    throw Exception(_extractError(response.body, 'No se pudo modificar el reporte.'));
  }

  /// Obtiene el historial de inspecciones del inspector técnico
  static Future<List<Map<String, dynamic>>> getHistorialInspeccionesTecnicas({
    String? buscar,
  }) async {
    final Map<String, String> queryParams = {};
    if (buscar != null && buscar.trim().isNotEmpty) {
      queryParams['buscar'] = buscar.trim();
    }

    final uri = Uri.parse('$baseUrl/mobile/inspecciones').replace(
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    final response = await _send(() async => _http.get(uri, headers: await _getHeaders()));

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      if (json['data'] is List) {
        return List<Map<String, dynamic>>.from(json['data']);
      }
    }
    return [];
  }

  /// Obtiene la lista paginada y filtrada de internamientos vehiculares
  static Future<Map<String, dynamic>> getInternamientos({
    String? buscar,
    String? estado,
    int page = 1,
    int porPagina = 20,
  }) async {
    final Map<String, String> params = {
      'page': page.toString(),
      'porPagina': porPagina.toString(),
    };
    if (buscar != null && buscar.trim().isNotEmpty) {
      params['buscar'] = buscar.trim();
    }
    if (estado != null && estado.isNotEmpty && estado != 'TODOS') {
      params['estado'] = estado;
    }

    final uri = Uri.parse('$baseUrl/internamientos').replace(queryParameters: params);
    final response = await _send(() async => _http.get(uri, headers: await _getHeaders()));

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return {
        'data': json['data'] is List ? List<Map<String, dynamic>>.from(json['data']) : <Map<String, dynamic>>[],
        'meta': json['meta'] is Map ? Map<String, dynamic>.from(json['meta']) : <String, dynamic>{},
      };
    }
    throw Exception(_extractError(response.body, 'Error al cargar internamientos'));
  }

  /// Obtiene los contadores estadísticos de internamientos
  static Future<Map<String, dynamic>> getInternamientoEstadisticas() async {
    final uri = Uri.parse('$baseUrl/internamientos/estadisticas');
    final response = await _send(() async => _http.get(uri, headers: await _getHeaders()));

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      if (json['data'] is Map) {
        return Map<String, dynamic>.from(json['data']);
      }
    }
    return {
      'total': 0,
      'enDeposito': 0,
      'liberados': 0,
      'avgDias': 0,
    };
  }

  /// Obtiene el catálogo de criterios de inventario vehicular para el depósito
  static Future<List<Map<String, dynamic>>> getInventarioCriterios() async {
    final uri = Uri.parse('$baseUrl/inventario-criterios');
    final response = await _send(() async => _http.get(uri, headers: await _getHeaders()));

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      if (json['data'] is List) {
        return List<Map<String, dynamic>>.from(json['data']);
      }
    }
    return [];
  }

  /// Actualiza observaciones, interesado e inventario de un internamiento
  static Future<Map<String, dynamic>> actualizarInternamiento(
    dynamic idOrUuid,
    Map<String, dynamic> data,
  ) async {
    final uri = Uri.parse('$baseUrl/internamientos/$idOrUuid');
    final response = await _send(
      () async => _http.put(
        uri,
        headers: await _getHeaders(),
        body: jsonEncode(data),
      ),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception(_extractError(response.body, 'Error al actualizar internamiento'));
  }

  /// Retorna la URL oficial para previsualizar y descargar la Boleta de Internamiento
  static String getBoletaPdfUrl(dynamic idOrUuid) {
    return '$baseUrl/internamientos/$idOrUuid/pdf';
  }

  /// Retorna la URL oficial para previsualizar y descargar la Orden de Libertad
  static String getLibertadPdfUrl(dynamic idOrUuid) {
    return '$baseUrl/internamientos/$idOrUuid/pdf-libertad';
  }
}
