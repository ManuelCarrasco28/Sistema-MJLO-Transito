import 'dart:convert';
import 'dart:async';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;

/// Envuelve las llamadas autenticadas: si el servidor responde 401 la sesión venció (o la cerraron),
/// se limpian las credenciales y se avisa a la app para volver al login en vez de mostrar errores sueltos.
class _ClienteAutenticado {
  const _ClienteAutenticado();

  Future<http.Response> get(Uri url, {Map<String, String>? headers}) async =>
      _revisar(await http.get(url, headers: headers));

  Future<http.Response> post(Uri url, {Map<String, String>? headers, Object? body}) async =>
      _revisar(await http.post(url, headers: headers, body: body));

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
  // 2. Celular físico / Wi-Fi: ejecutar con --dart-define=API_URL=http://IP_DE_TU_PC:8080/api
  static const String _defaultUrl = 'http://10.24.31.109:8080/api'; // Conexión local al backend en esta red
  // Clave compartida con el backend (app.mobileKey): se pasa con --dart-define=MOBILE_KEY=... y no queda en el código.
  static const String _mobileKey = String.fromEnvironment('MOBILE_KEY');
  static const String _configuredUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: _defaultUrl,
  );

  static const String baseUrl = kIsWeb
      ? 'http://127.0.0.1:8080/api'
      : _configuredUrl;
  static String get fileBaseUrl => baseUrl.replaceAll(RegExp(r'/api/?$'), '');
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
  static Future<void> saveSavedCredentials(String username, String password) async {
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
        if (_cookieEnMemoria != null && _cookieEnMemoria!.isNotEmpty) 'Cookie': _cookieEnMemoria!,
      };

  /// URL de un archivo guardado en el servidor (foto, firma). Acepta la ruta relativa ('papeletas/abc.jpg')
  /// o la URL completa que arma el servidor, y siempre apunta al servidor que usa la app.
  static String urlArchivo(String ruta) {
    final r = ruta.trim();
    if (r.startsWith('data:')) return r;
    final i = r.indexOf('/api/files/');
    if (i >= 0) return '$baseUrl/files/${r.substring(i + '/api/files/'.length)}';
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
            await _secureStorage.write(key: _sessionCookieKey, value: match.group(0)!);
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
        await prefs.setString('nombres', data['data']['nombres']);
        await prefs.setString('apellidos', data['data']['apellidos']);
        await prefs.setString('usuario', username);
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
    // Limpiar la sesión sin borrar el historial ni las preferencias.
    await prefs.remove('id_persona');
    await prefs.remove('nombres');
    await prefs.remove('apellidos');
    await prefs.remove('usuario');
    _cookieEnMemoria = null;
    try {
      await _secureStorage.delete(key: _sessionCookieKey);
    } catch (_) {}
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
    final uri = Uri.parse('$baseUrl/papeletas').replace(queryParameters: params);

    final response = await _http
        .get(
          uri,
          headers: await _getHeaders(isJson: false),
        )
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
    final uri = Uri.parse('$baseUrl/reportes-intervencion').replace(queryParameters: params);

    final response = await _http
        .get(
          uri,
          headers: await _getHeaders(isJson: false),
        )
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

    final uri = Uri.parse('$baseUrl/mobile/vehiculos/buscar').replace(
      queryParameters: qParams,
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
}
