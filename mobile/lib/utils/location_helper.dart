import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart' as geocoding;

/// Solicita el permiso de ubicación y obtiene la posición GPS actual,
/// mostrando un diálogo para encender el GPS si está apagado.
Future<Position> obtenerPosicionActualConContexto(BuildContext context) async {
  bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    if (!context.mounted) {
      throw Exception('El GPS de tu teléfono está apagado. Actívalo o ingresa la dirección manualmente.');
    }

    final bool? activar = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
        contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        actionsPadding: const EdgeInsets.all(16),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.location_off_rounded, color: Color(0xFF2563EB), size: 26),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Activar GPS',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ),
          ],
        ),
        content: const Text(
          'Para ubicar automáticamente la calle y las coordenadas del lugar de intervención, necesitas encender la ubicación de tu teléfono.',
          style: TextStyle(fontSize: 14, color: Color(0xFF475569), height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Ingresar manual', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E3A8A),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.location_on_rounded, size: 18),
            label: const Text('Encender GPS', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (activar == true) {
      await Geolocator.openLocationSettings();
      // Esperar brevemente a que el sistema operativo aplique el encendido
      await Future.delayed(const Duration(milliseconds: 1500));
      serviceEnabled = await Geolocator.isLocationServiceEnabled();
    }

    if (!serviceEnabled) {
      throw Exception('El GPS sigue apagado. Actívalo para obtener el lugar automáticamente o ingrésalo manualmente.');
    }
  }

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied) {
      throw Exception('Se requieren permisos de ubicación para detectar el lugar de forma automática.');
    }
  }

  if (permission == LocationPermission.deniedForever) {
    if (context.mounted) {
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Permisos de Ubicación Bloqueados', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          content: const Text(
            'Los permisos de ubicación fueron denegados permanentemente en tu teléfono. Por favor, habilítalos desde la configuración de la aplicación.',
            style: TextStyle(fontSize: 14, color: Color(0xFF475569)),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cerrar', style: TextStyle(color: Color(0xFF64748B))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E3A8A),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                Navigator.pop(ctx);
                Geolocator.openAppSettings();
              },
              child: const Text('Abrir Ajustes'),
            ),
          ],
        ),
      );
    }
    throw Exception('Permisos de ubicación desactivados en los ajustes del teléfono.');
  }

  return Geolocator.getCurrentPosition();
}

/// Solicita el permiso de ubicación y obtiene la posición GPS actual.
Future<Position> obtenerPosicionActual() async {
  final serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    throw Exception('El GPS de tu dispositivo está apagado. Actívalo para obtener la ubicación o ingrésala manualmente.');
  }

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied) {
      throw Exception('Los permisos de ubicación fueron denegados.');
    }
  }

  if (permission == LocationPermission.deniedForever) {
    throw Exception('Los permisos de ubicación están denegados en los ajustes del teléfono.');
  }

  return Geolocator.getCurrentPosition();
}

/// Convierte una posición GPS en una dirección legible (calle + distrito).
/// Si la geocodificación falla o no arroja resultados, devuelve las
/// coordenadas como texto de respaldo.
Future<String> obtenerDireccionDesdePosicion(Position position) async {
  String address = '${position.latitude}, ${position.longitude}';
  try {
    final placemarks = await geocoding.Geocoding().placemarkFromCoordinates(position.latitude, position.longitude);
    if (placemarks.isNotEmpty) {
      final place = placemarks.first;
      address = '${place.thoroughfare ?? ''} ${place.subThoroughfare ?? ''}'.trim();
      if (address.isEmpty) address = place.street ?? '';
      final locality = place.locality ?? place.subAdministrativeArea ?? '';
      if (locality.isNotEmpty) address = address.isEmpty ? locality : '$address, $locality';
      if (address.trim().isEmpty) address = '${position.latitude}, ${position.longitude}';
    }
  } catch (_) {
    // Fallback a coordenadas si falla la geocodificación
  }
  return address;
}
