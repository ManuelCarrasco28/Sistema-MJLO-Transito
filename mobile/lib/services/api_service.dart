import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'package:flutter/foundation.dart' show kIsWeb;

class ApiService {
  static const String _pcWifiBaseUrl = 'http://192.168.137.44:8080/api';
  static const String baseUrl = kIsWeb ? 'http://127.0.0.1:8080/api' : _pcWifiBaseUrl;
  static const String fileBaseUrl = kIsWeb ? 'http://127.0.0.1:8080' : 'http://192.168.137.44:8080';

  static Future<Map<String, dynamic>> login(String username, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'usuario': username,
        'password': password,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['status'] == true) {
        final prefs = await SharedPreferences.getInstance();
        
        final personalId = data['data']['personal_id'];
        final int parsedId = personalId is int ? personalId : int.parse(personalId.toString());
        
        await prefs.setInt('personal_id', parsedId);
        await prefs.setString('nombres', data['data']['nombres']);
        await prefs.setString('apellidos', data['data']['apellidos']);
        return data;
      }
    }
    throw Exception(_extractError(response.body, 'Error de autenticación'));
  }

  static Future<int?> getPersonalId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('personal_id');
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  static Future<List<dynamic>> getPapeletas() async {
    final response = await http.get(Uri.parse('$baseUrl/papeletas'));
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'] ?? [];
    }
    throw Exception('Error al cargar historial');
  }

  static Future<Map<String, dynamic>> createPapeleta(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('$baseUrl/papeletas'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception(_extractError(response.body, 'Error al registrar papeleta'));
  }

  static Future<void> uploadFirma(int papeletaId, String firmaBase64) async {
    final response = await http.post(
      Uri.parse('$baseUrl/papeletas/$papeletaId/firma'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'firmaBase64': firmaBase64,
        'estado': 'FIRMADO'
      }),
    );

    if (response.statusCode != 200) {
      throw Exception(_extractError(response.body, 'Error al subir firma'));
    }
  }

  static Future<List<dynamic>> getTiposInfraccion() async {
    final response = await http.get(Uri.parse('$baseUrl/tipos-infraccion'));
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'] ?? [];
    }
    return [];
  }

  static Future<List<dynamic>> getVehiculos() async {
    final response = await http.get(Uri.parse('$baseUrl/vehiculos'));
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
}
