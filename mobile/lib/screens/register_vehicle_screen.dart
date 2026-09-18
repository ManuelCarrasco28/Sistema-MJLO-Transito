import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart' as geocoding;

import '../theme.dart';
import 'issue_ticket_informal_screen.dart';
class RegisterVehicleScreen extends StatefulWidget {
  const RegisterVehicleScreen({super.key});

  @override
  State<RegisterVehicleScreen> createState() => _RegisterVehicleScreenState();
}

class _RegisterVehicleScreenState extends State<RegisterVehicleScreen> {
  // Características del Vehículo

  // Características (Solo para Sin Placa)
  final _claseController = TextEditingController();
  final _marcaController = TextEditingController();
  final _colorController = TextEditingController();
  final _motorController = TextEditingController();

  // GPS y Evidencias
  bool _isLoadingLocation = false;
  final List<XFile> _fotos = [];
  Position? _currentPosition;
  final ImagePicker _picker = ImagePicker();
  final _lugarController = TextEditingController();
  final _coordenadasController = TextEditingController();
  final _observacionesController = TextEditingController();

  Future<void> _takePhoto() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
      );
      if (photo != null) {
        setState(() {
          _fotos.add(photo);
        });
      }
    } catch (e) {
      _showError('Error al tomar la foto: $e');
    }
  }

  Future<void> _getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    setState(() {
      _isLoadingLocation = true;
    });

    try {
      serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _showError('Los servicios de ubicación están desactivados.');
        return;
      }

      permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _showError('Los permisos de ubicación fueron denegados.');
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _showError('Los permisos de ubicación están denegados permanentemente.');
        return;
      }

      final position = await Geolocator.getCurrentPosition();
      
      // Geocodificación inversa
      String address = '${position.latitude}, ${position.longitude}';
      try {
        List<geocoding.Placemark> placemarks = await geocoding.Geocoding().placemarkFromCoordinates(position.latitude, position.longitude);
        if (placemarks.isNotEmpty) {
          final place = placemarks.first;
          address = '${place.thoroughfare ?? ''} ${place.subThoroughfare ?? ''}'.trim();
          if (address.isEmpty) {
            address = place.street ?? '';
          }
          final locality = place.locality ?? place.subAdministrativeArea ?? '';
          if (locality.isNotEmpty) {
            address = address.isEmpty ? locality : '$address, $locality';
          }
          if (address.trim().isEmpty) {
            address = '${position.latitude}, ${position.longitude}';
          }
        }
      } catch (e) {
        // Fallback a coordenadas si falla
      }

      setState(() {
        _currentPosition = position;
        _lugarController.text = address;
        _coordenadasController.text = '${position.latitude}, ${position.longitude}';
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ubicación obtenida correctamente')),
        );
      }
    } catch (e) {
      _showError('Error al obtener la ubicación: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingLocation = false;
        });
      }
    }
  }

  void _continuarAEvidencia() {
    final Map<String, dynamic> reporteData = {
      'dni_conductor': '',
      'nombres_conductor': '',
      'apellidos_conductor': '',
      'conductor_es_dueno': false,
      'dni_dueno': '',
      'nombres_dueno': '',
      'apellidos_dueno': '',
      'estado_placa': 'SIN_PLACA',
      'placa': null,
      'chasis': null,
      'clase_vehiculo': _claseController.text.trim().toUpperCase(),
      'marca_vehiculo': _marcaController.text.trim().toUpperCase(),
      'color_vehiculo': _colorController.text.trim().toUpperCase(),
      'motor_vehiculo': _motorController.text.trim().toUpperCase(),
      'lugar': _lugarController.text.trim(),
      'observaciones': _observacionesController.text.trim(),
      'fotos': _fotos,
      'coordenadas': _currentPosition != null ? '${_currentPosition!.latitude},${_currentPosition!.longitude}' : null,
    };

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => IssueTicketInformalScreen(reporteData: reporteData),
      ),
    );
  }



  void _showError(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
    }
  }

  @override
  void dispose() {
    _claseController.dispose();
    _marcaController.dispose();
    _colorController.dispose();
    _motorController.dispose();
    _lugarController.dispose();
    _coordenadasController.dispose();
    _observacionesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Registrar Evidencia', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E3A8A),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 24),
            
            const Padding(
              padding: EdgeInsets.only(bottom: 8.0),
              child: Text('Características del Vehículo (Opcional)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
            ),
            _buildTextField(_claseController, 'Clase (Ej: Mototaxi)', Icons.category, TextInputType.text),
            const SizedBox(height: 12),
            _buildTextField(_marcaController, 'Marca', Icons.branding_watermark, TextInputType.text),
            const SizedBox(height: 12),
            _buildTextField(_colorController, 'Color', Icons.color_lens, TextInputType.text),
            const SizedBox(height: 12),
            _buildTextField(_motorController, 'Código de Motor', Icons.settings, TextInputType.text),
            
            const SizedBox(height: 16),
            const Padding(
              padding: EdgeInsets.only(bottom: 8.0),
              child: Text('Lugar y Evidencia', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.teal)),
            ),
            
            TextFormField(
              controller: _lugarController,
              decoration: InputDecoration(
                labelText: 'Lugar de Intervención (Calle/Nombre)',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.white,
                prefixIcon: const Icon(Icons.location_on, color: Colors.grey),
                suffixIcon: Padding(
                  padding: const EdgeInsets.all(4.0),
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppTheme.primaryBlue,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: _isLoadingLocation 
                      ? const Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)))
                      : IconButton(
                          icon: const Icon(Icons.my_location, color: Colors.white),
                          onPressed: _getCurrentLocation,
                        ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _coordenadasController,
              readOnly: true,
              decoration: InputDecoration(
                labelText: 'Coordenadas exactas',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.grey.shade100,
                prefixIcon: const Icon(Icons.gps_fixed, color: Colors.grey),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _observacionesController,
              decoration: InputDecoration(
                labelText: 'Observaciones',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.white,
                alignLabelWithHint: true,
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 16),
            
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: const Text('Evidencia Fotográfica', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        onPressed: _takePhoto,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange.shade600,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                        icon: const Icon(Icons.camera_alt, size: 20),
                        label: const Text('Tomar Foto', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  if (_fotos.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 100,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: _fotos.length,
                        itemBuilder: (context, index) {
                          return Stack(
                            children: [
                              Container(
                                margin: const EdgeInsets.only(right: 12, top: 8),
                                width: 100,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  image: DecorationImage(
                                    image: FileImage(File(_fotos[index].path)),
                                    fit: BoxFit.cover,
                                  ),
                                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4)],
                                ),
                              ),
                              Positioned(
                                right: 4,
                                top: 0,
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _fotos.removeAt(index);
                                    });
                                  },
                                  child: Container(
                                    decoration: const BoxDecoration(
                                      color: Colors.red,
                                      shape: BoxShape.circle,
                                    ),
                                    padding: const EdgeInsets.all(4),
                                    child: const Icon(Icons.close, color: Colors.white, size: 16),
                                  ),
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
            
            const SizedBox(height: 24),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: SizedBox(
            width: double.infinity,
            height: 55,
            child: ElevatedButton.icon(
              onPressed: _continuarAEvidencia,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryBlue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 5,
              ),
              icon: const Icon(Icons.arrow_forward),
              label: const Text(
                'Siguiente: Registrar evidencia',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, TextInputType type) {
    return TextField(
      controller: controller,
      keyboardType: type,
      textCapitalization: TextCapitalization.characters,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: Colors.grey.shade600),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.white,
      ),
    );
  }
}
