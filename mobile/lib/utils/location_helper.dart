import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart' as geocoding;

/// Solicita el permiso de ubicación y obtiene la posición GPS actual.
/// Lanza un [Exception] con un mensaje listo para mostrar al usuario si el
/// servicio está desactivado o el permiso fue denegado.
Future<Position> obtenerPosicionActual() async {
  final serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    throw Exception('Los servicios de ubicación están desactivados.');
  }

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied) {
      throw Exception('Los permisos de ubicación fueron denegados.');
    }
  }

  if (permission == LocationPermission.deniedForever) {
    throw Exception('Los permisos de ubicación están denegados permanentemente.');
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
