import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:flutter/foundation.dart' show kIsWeb;

class ApiService {
  // La cookie de sesión es una credencial: se guarda en almacenamiento
  // cifrado (Keystore en Android / Keychain en iOS), no en SharedPreferences
  // en texto plano.
  static const _secureStorage = FlutterSecureStorage();
  static const _sessionCookieKey = 'session_cookie';
  // Configuración de URL del Backend:
  // 1. Emulador Android local: 10.0.2.2 apunta a tu PC.
  // 2. Celular físico / Wi-Fi: ejecutar con --dart-define=API_URL=http://IP_DE_TU_PC:8080/api
  static const String _defaultUrl = 'http://192.168.101.47:8080/api'; // Cambiado a IP actual
  static const String _configuredUrl = String.fromEnvironment('API_URL', defaultValue: _defaultUrl);

  static const String baseUrl = kIsWeb
      ? 'http://127.0.0.1:8080/api'
      : _configuredUrl;
  static String get fileBaseUrl => baseUrl.replaceAll(RegExp(r'/api/?$'), '');
  static const Duration _requestTimeout = Duration(seconds: 20);

  static Future<Map<String, String>> _getHeaders({bool isJson = true}) async {
    final cookie = await _secureStorage.read(key: _sessionCookieKey);
    final headers = <String, String>{
      'X-Mobile-App': 'MJLO-TRANSITO',
      if (isJson) 'Content-Type': 'application/json',
      if (cookie != null && cookie.isNotEmpty) 'Cookie': cookie,
    };
    return headers;
  }

  static Future<Map<String, dynamic>> login(String username, String password) async {
    final response = await _send(() => http.post(
          Uri.parse('$baseUrl/login'),
          headers: {
            'Content-Type': 'application/json',
            'X-Mobile-App': 'MJLO-TRANSITO',
          },
          body: jsonEncode({
            'usuario': username,
            'password': password,
          }),
        ));

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['status'] == true) {
        final prefs = await SharedPreferences.getInstance();

        final rawCookie = response.headers['set-cookie'];
        if (rawCookie != null) {
          final match = RegExp(r'session_user=[^;]+').firstMatch(rawCookie);
          if (match != null) {
            await _secureStorage.write(key: _sessionCookieKey, value: match.group(0)!);
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
        return data;
      }
    }
    throw Exception(_extractError(response.body, 'Error de autenticación'));
  }

  static Future<int?> getPersonalId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('id_persona');
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    await _secureStorage.delete(key: _sessionCookieKey);
  }

  static Future<List<dynamic>> getPapeletas({String? dni, String? placa}) async {
    final int? idPersona = await getPersonalId();
    if (idPersona == null) return [];
    
    final Map<String, dynamic> params = {};
    if (dni == null && placa == null) {
      params['inspector_id'] = idPersona.toString();
    }
    if (dni != null) params['dni'] = dni;
    if (placa != null) params['placa'] = placa;
    
    final uri = Uri.parse('$baseUrl/papeletas').replace(queryParameters: params);
    
    final response = await http
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
    
    final response = await http
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
    final response = await http
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

    final response = await http
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

  static Future<bool> permiteAplicarPapeletaMovil() async {
    final uri = Uri.parse('$baseUrl/mobile/config').replace(
      queryParameters: {'_': DateTime.now().millisecondsSinceEpoch.toString()},
    );
    final response = await http
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

    final response = await http
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

    final response = await http
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
    final response = await http
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
    final response = await http
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
    final response = await http
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
    String valor,
  ) async {
    final uri = Uri.parse('$baseUrl/mobile/vehiculos/buscar').replace(
      queryParameters: {
        'tipo': tipo,
        'valor': valor,
        '_': DateTime.now().millisecondsSinceEpoch.toString(),
      },
    );
    final response = await http
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
    final response = await http
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

  static Future<List<dynamic>> getVehiculosByPersonaDni(String dni) async {
    final response = await http
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

  static Future<http.Response> _send(Future<http.Response> Function() request) async {
    try {
      return await request().timeout(_requestTimeout);
    } on TimeoutException {
      throw Exception('No se pudo conectar con el servidor en $baseUrl. Verifica que tu PC y celular estén en el mismo Wi-Fi y el servidor esté encendido.');
    } catch (_) {
      throw Exception('No se pudo conectar con el servidor. Verifica la conexión y que el backend esté levantado.');
    }
  }
}
