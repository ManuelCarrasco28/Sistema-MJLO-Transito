import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../theme.dart';
import '../utils/location_helper.dart';
import '../utils/oficinas_registrales.dart';
import 'issue_ticket_informal_screen.dart';

class RegisterAlienVehicleScreen extends StatefulWidget {
  final Map<String, dynamic> conductor;

  const RegisterAlienVehicleScreen({super.key, required this.conductor});

  @override
  State<RegisterAlienVehicleScreen> createState() =>
      _RegisterAlienVehicleScreenState();
}

class _RegisterAlienVehicleScreenState
    extends State<RegisterAlienVehicleScreen> {
  // Dueño eliminado para no vincular automáticamente

  // Vehículo
  String _estadoPlaca = 'CON_PLACA'; // 'CON_PLACA', 'SIN_PLACA'
  final _placaController = TextEditingController();
  OficinaRegistral _selectedOficina = kOficinaChiclayo;

  // Características
  final _claseController = TextEditingController();
  final _marcaController = TextEditingController();
  final _colorController = TextEditingController();
  final _chasisController = TextEditingController();
  Map<String, dynamic>? _vehiculoData;

  // GPS y Evidencias
  bool _isLoadingLocation = false;
  final List<XFile> _fotos = [];
  Position? _currentPosition;
  final ImagePicker _picker = ImagePicker();
  final MapController _mapController = MapController();
  final _lugarController = TextEditingController();
  final _coordenadasController = TextEditingController();
  final _observacionesController = TextEditingController();

  final _duenioDniController = TextEditingController();
  final _duenioNombresController = TextEditingController();
  final _duenioApellidosController = TextEditingController();

  bool _isSearching = false;
  bool _vehiculoEncontrado = false;
  bool? _permitePapeleta;

  @override
  void initState() {
    super.initState();
    _loadPermiso();
  }

  Future<void> _loadPermiso() async {
    final permite = await ApiService.permiteAplicarPapeletaMovil();
    if (mounted) {
      setState(() {
        _permitePapeleta = permite;
      });
    }
  }


  Future<void> _searchVehiculo() async {
    final placa = _placaController.text.trim();
    if (placa.isEmpty) {
      _showError('Ingrese una placa para buscar');
      return;
    }
    setState(() {
      _isSearching = true;
    });
    try {
      final vehiculo = await ApiService.buscarVehiculo(
        'placa',
        placa,
        codeZona: _selectedOficina.codeZona,
        codeOficina: _selectedOficina.codeOficina,
      );
      if (vehiculo != null) {
        setState(() {
          _vehiculoEncontrado = true;
          _vehiculoData = vehiculo;
          _marcaController.text = vehiculo['marca'] ?? '';
          _colorController.text = vehiculo['color'] ?? '';
          _claseController.text = vehiculo['modelo'] ?? '';
          _chasisController.text =
              vehiculo['numeroSerie'] ?? vehiculo['chasis'] ?? '';

          if (vehiculo['propietario'] != null &&
              vehiculo['propietario'] != 'Sin Propietario Asignado') {
            _duenioDniController.text = vehiculo['propietarioDni'] ?? '';
            _duenioNombresController.text = vehiculo['propietario'] ?? '';
            _duenioApellidosController.text = '';
          } else {
            _duenioDniController.text = '';
            _duenioNombresController.text = '';
            _duenioApellidosController.text = '';
          }
        });
      } else {
        setState(() {
          _vehiculoEncontrado = false;
          _vehiculoData = null;
          _marcaController.text = '';
          _colorController.text = '';
          _claseController.text = '';
          _duenioDniController.text = '';
          _duenioNombresController.text = '';
          _duenioApellidosController.text = '';
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'No se encontró la placa en ${_selectedOficina.descripcion}. Verifique si está bien escrita o intente cambiando la sede de registro (SUNARP).',
              ),
              duration: const Duration(seconds: 4),
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _vehiculoEncontrado = false;
        _vehiculoData = null;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No se pudo consultar el vehículo. Verifique la conexión e intente de nuevo.',
            ),
            duration: Duration(seconds: 4),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  Future<void> _takePhoto() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
        maxWidth: 1600,
        maxHeight: 1600,
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
    setState(() {
      _isLoadingLocation = true;
    });

    try {
      final position = await obtenerPosicionActualConContexto(context);
      final address = await obtenerDireccionDesdePosicion(position);

      final bool wasNull = _currentPosition == null;
      setState(() {
        _currentPosition = position;
        _lugarController.text = address;
        _coordenadasController.text =
            '${position.latitude}, ${position.longitude}';
      });

      if (!wasNull) {
        _mapController.move(
          LatLng(position.latitude, position.longitude),
          16.0,
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ubicación obtenida correctamente')),
        );
      }
    } catch (e) {
      _showError(
        e is Exception
            ? e.toString().replaceFirst('Exception: ', '')
            : 'Error al obtener la ubicación: $e',
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingLocation = false;
        });
      }
    }
  }

  void _continuarAEvidencia() {
    if (_estadoPlaca == 'CON_PLACA' && _placaController.text.isEmpty) {
      _showError('Ingresa la placa del vehículo');
      return;
    }

    bool permite = _permitePapeleta ?? true;
    if (_estadoPlaca == 'SIN_PLACA') {
      permite = false;
    }

    if (!permite) {
      if (_lugarController.text.trim().isEmpty) {
        _showError('Falta ingresar el lugar de intervención (ubicación)');
        return;
      }
      if (_observacionesController.text.trim().isEmpty) {
        _showError(
          'Falta ingresar las observaciones obligatorias para el reporte',
        );
        return;
      }
    }

    final Map<String, dynamic> reporteData = {
      'dni_conductor': widget.conductor['numeroDocumento'] ?? '',
      'nombres_conductor': widget.conductor['nombres'] ?? '',
      'apellidos_conductor':
          '${widget.conductor['apellidoPaterno'] ?? ''} ${widget.conductor['apellidoMaterno'] ?? ''}'
              .trim(),

      'dueño_es_conductor': false,
      'dni_dueño': _estadoPlaca == 'SIN_PLACA' ? '' : _duenioDniController.text,
      'nombres_dueño': _estadoPlaca == 'SIN_PLACA' ? '' : _duenioNombresController.text,
      'apellidos_dueño': _estadoPlaca == 'SIN_PLACA' ? '' : _duenioApellidosController.text,

      'estado_placa': _estadoPlaca,
      'placa': _estadoPlaca == 'CON_PLACA'
          ? _placaController.text.trim().toUpperCase()
          : null,
      'chasis': _chasisController.text.trim().toUpperCase(),

      'clase_vehiculo': _claseController.text.trim().toUpperCase(),
      'marca_vehiculo': _marcaController.text.trim().toUpperCase(),
      'color_vehiculo': _colorController.text.trim().toUpperCase(),
      'motor_vehiculo': '',

      'lugar': _lugarController.text.trim(),
      'observaciones': _observacionesController.text.trim(),
      'fotos': _fotos,
      'coordenadas': _currentPosition != null
          ? '${_currentPosition!.latitude},${_currentPosition!.longitude}'
          : null,
    };

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => IssueTicketInformalScreen(reporteData: reporteData),
      ),
    );
  }

  void _showError(String msg) {
    final cleanMsg = msg.replaceAll('Exception: ', '');
    if (mounted) {
      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(cleanMsg), backgroundColor: Colors.red));
    }
  }

  @override
  void dispose() {
    _placaController.dispose();
    _claseController.dispose();
    _marcaController.dispose();
    _colorController.dispose();
    _chasisController.dispose();
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
        title: const Text(
          'Registrar Vehículo Ajeno',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        backgroundColor: AppTheme.primaryBlue,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '1. Datos del Conductor',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E3A8A),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'N° Doc: ${widget.conductor['numeroDocumento']}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text('Nombres: ${widget.conductor['nombres']}'),
                  const SizedBox(height: 4),
                  Text(
                    'Apellidos: ${widget.conductor['apellidoPaterno']} ${widget.conductor['apellidoMaterno'] ?? ''}'
                        .trim(),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),
            const Text(
              '2. Datos del Vehículo',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E3A8A),
              ),
            ),
            const SizedBox(height: 12),

            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                children: [
                  RadioListTile<String>(
                    title: const Text(
                      'Tiene Placa',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    value: 'CON_PLACA',
                    groupValue: _estadoPlaca,
                    onChanged: (val) {
                      setState(() {
                        _estadoPlaca = val!;
                        if (val != 'CON_PLACA') {
                          // SIN_PLACA: limpia placa
                          _placaController.clear();
                        }
                      });
                    },
                  ),
                  const Divider(height: 1),
                  RadioListTile<String>(
                    title: const Text(
                      'Sin Placa',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    value: 'SIN_PLACA',
                    groupValue: _estadoPlaca,
                    onChanged: (val) {
                      setState(() {
                        _estadoPlaca = val!;
                        _placaController.clear();
                      });
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),
            if (_estadoPlaca == 'CON_PLACA') ...[
              _buildTextField(
                _placaController,
                'Número de Placa',
                Icons.directions_car,
                TextInputType.text,
                hasSearch: true,
                onSearch: _searchVehiculo,
                maxLength: 8,
              ),
              const SizedBox(height: 10),
              SedeRegistralField(
                selected: _selectedOficina,
                onChanged: (nueva) {
                  setState(() {
                    _selectedOficina = nueva;
                  });
                },
              ),
              const SizedBox(height: 16),
            ],

            if (_estadoPlaca == 'CON_PLACA' && _vehiculoEncontrado) ...[
              _buildVehicleSummaryCard(),
            ],

            if (_estadoPlaca == 'SIN_PLACA') ...[
              const Padding(
                padding: EdgeInsets.only(bottom: 8.0),
                child: Text(
                  'Características del Vehículo',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.orange,
                  ),
                ),
              ),
              _buildTextField(
                _claseController,
                'Clase (Ej: Mototaxi)',
                Icons.category,
                TextInputType.text,
              ),
              const SizedBox(height: 12),
              _buildTextField(
                _marcaController,
                'Marca',
                Icons.branding_watermark,
                TextInputType.text,
              ),
              const SizedBox(height: 12),
              _buildTextField(
                _colorController,
                'Color',
                Icons.color_lens,
                TextInputType.text,
              ),
              const SizedBox(height: 12),
              _buildTextField(
                _chasisController,
                'Número de Serie (Chasis)',
                Icons.settings,
                TextInputType.text,
              ),
            ],



            const SizedBox(height: 16),
            const Padding(
              padding: EdgeInsets.only(bottom: 8.0),
              child: Text(
                'Lugar y Evidencia',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.teal,
                ),
              ),
            ),

            TextFormField(
              controller: _lugarController,
              decoration: InputDecoration(
                labelText: 'Lugar de Intervención (Calle/Nombre)',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
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
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            ),
                          )
                        : IconButton(
                            icon: const Icon(
                              Icons.my_location,
                              color: Colors.white,
                            ),
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
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Colors.grey.shade100,
                prefixIcon: const Icon(Icons.gps_fixed, color: Colors.grey),
              ),
            ),

            if (_currentPosition != null) ...[
              const SizedBox(height: 12),
              const Text(
                'Ajuste manual (toca el mapa para cambiar la ubicación exacta)',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 4),
              Container(
                height: 200,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                clipBehavior: Clip.antiAlias,
                child: FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: LatLng(
                      _currentPosition!.latitude,
                      _currentPosition!.longitude,
                    ),
                    initialZoom: 16.0,
                    onTap: (tapPosition, point) {
                      setState(() {
                        _currentPosition = Position(
                          latitude: point.latitude,
                          longitude: point.longitude,
                          timestamp: DateTime.now(),
                          accuracy: 0.0,
                          altitude: 0.0,
                          heading: 0.0,
                          speed: 0.0,
                          speedAccuracy: 0.0,
                          altitudeAccuracy: 0.0,
                          headingAccuracy: 0.0,
                        );
                        _coordenadasController.text =
                            '${point.latitude}, ${point.longitude}';
                      });
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.mjlo.transito',
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(
                            _currentPosition!.latitude,
                            _currentPosition!.longitude,
                          ),
                          width: 40,
                          height: 40,
                          child: const Icon(
                            Icons.location_on,
                            color: Colors.red,
                            size: 40,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 12),
            TextField(
              controller: _observacionesController,
              decoration: InputDecoration(
                labelText: 'Observaciones',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
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
                        child: const Text(
                          'Evidencia Fotográfica',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        onPressed: _takePhoto,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange.shade600,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                        ),
                        icon: const Icon(Icons.camera_alt, size: 20),
                        label: const Text(
                          'Tomar Foto',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
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
                                margin: const EdgeInsets.only(
                                  right: 12,
                                  top: 8,
                                ),
                                width: 100,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  image: DecorationImage(
                                    image: FileImage(File(_fotos[index].path)),
                                    fit: BoxFit.cover,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.1),
                                      blurRadius: 4,
                                    ),
                                  ],
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
                                    child: const Icon(
                                      Icons.close,
                                      color: Colors.white,
                                      size: 16,
                                    ),
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
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 5,
              ),
              icon: const Icon(Icons.arrow_forward),
              label: Text(
                _permitePapeleta == null
                    ? 'Cargando...'
                    : ((_permitePapeleta! && _estadoPlaca != 'SIN_PLACA')
                          ? 'Siguiente: Generar Papeleta'
                          : 'Siguiente: Enviar Reporte'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label,
    IconData icon,
    TextInputType type, {
    bool hasSearch = false,
    VoidCallback? onSearch,
    bool readOnly = false,
    int? maxLength,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return TextField(
      controller: controller,
      keyboardType: type,
      textCapitalization: TextCapitalization.characters,
      readOnly: readOnly,
      maxLength: maxLength,
      inputFormatters: inputFormatters,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: Colors.grey.shade600),
        suffixIcon: hasSearch
            ? Padding(
                padding: const EdgeInsets.all(4.0),
                child: ElevatedButton(
                  onPressed: _isSearching ? null : onSearch,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  child: _isSearching
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Buscar',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                ),
              )
            : null,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: readOnly ? Colors.grey.shade200 : Colors.white,
      ),
    );
  }

  Widget _buildVehicleSummaryCard() {
    final isFormal = _vehiculoData?['asociacion'] != null;
    final estadoTexto = isFormal ? 'FORMAL' : 'INFORMAL';
    final estadoColor = isFormal ? Colors.blueAccent : Colors.redAccent;
    final expectedDocs = ['TARJETA_OPERATIVIDAD', 'TARJETA_PROPIEDAD', 'SOAT', 'CERTICAV'];
    final List<dynamic> allDocs = List.from(_vehiculoData?['documentosVehiculo'] ?? _vehiculoData?['documentos'] ?? []);

    if (_vehiculoData?['certicav'] != null &&
        !allDocs.any((d) => (d['tipoDocumento'] ?? '').toString().toUpperCase() == 'CERTICAV')) {
      final c = _vehiculoData!['certicav'];
      allDocs.add({
        'tipoDocumento': 'CERTICAV',
        'numero': c['numeroSerieCerticav'] ?? c['numeroRegistro'],
        'estado': c['resultado'] ?? c['estado'] ?? 'VIGENTE',
        'fechaExpiracion': c['fecha'],
      });
    }

    for (var expected in expectedDocs) {
      if (!allDocs.any((d) => (d['tipoDocumento'] ?? '').toString().toUpperCase() == expected)) {
        allDocs.add({
          'tipoDocumento': expected,
          'estado': 'NO REGISTRADO',
        });
      }
    }

    return Card(
      color: const Color(0xFF0F172A),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(
                      Icons.check_circle,
                      color: Colors.greenAccent,
                      size: 20,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'VEHÍCULO ENCONTRADO',
                      style: TextStyle(
                        color: Colors.greenAccent,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: estadoColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: estadoColor),
                  ),
                  child: Text(
                    estadoTexto,
                    style: TextStyle(
                      color: estadoColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (!isFormal)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Column(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.red.shade700, size: 28),
                    const SizedBox(height: 8),
                    Text(
                      'Vehículo no registrado en la municipalidad de JLO',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.red.shade700,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            _buildSummaryRow(
              'MARCA',
              _marcaController.text.isNotEmpty ? _marcaController.text : (_vehiculoData?['marca'] ?? '-'),
              'CLASE',
              _claseController.text.isNotEmpty ? _claseController.text : (_vehiculoData?['modelo'] ?? _vehiculoData?['tipo'] ?? '-'),
            ),
            const SizedBox(height: 12),
            _buildSummaryRow(
              'COLOR',
              _colorController.text.isNotEmpty ? _colorController.text : (_vehiculoData?['color'] ?? '-'),
              'AÑO FABRICACIÓN',
              (_vehiculoData?['anio'] ?? _vehiculoData?['ano_fabricacion'] ?? _vehiculoData?['anio_fabricacion'] ?? '-').toString(),
            ),
            const SizedBox(height: 12),
            _buildSummaryRow(
              'CATEGORÍA',
              (_vehiculoData?['categoria'] ?? '-').toString(),
              'CARROCERÍA',
              (_vehiculoData?['carroceria'] ?? '-').toString(),
            ),
            const SizedBox(height: 12),
            _buildSummaryRow(
              'TIPO DE CARROCERÍA',
              (_vehiculoData?['tipoCarroceria'] ?? _vehiculoData?['tipo_carroceria'] ?? '-').toString(),
              'SEDE DE REGISTRO',
              (_vehiculoData?['sedeRegistro'] ?? _vehiculoData?['sede'] ?? '-').toString(),
            ),
            const SizedBox(height: 12),
            _buildSummaryRow(
              'CHASIS (N° SERIE)',
              _chasisController.text.isNotEmpty
                  ? _chasisController.text
                  : (_vehiculoData?['numeroSerie'] ?? _vehiculoData?['serie'] ?? '-').toString(),
              'SERIE DEL MOTOR',
              (_vehiculoData?['serieMotor'] ?? _vehiculoData?['numeroMotor'] ?? _vehiculoData?['nro_motor'] ?? '-').toString(),
            ),
            const Divider(color: Colors.white24, height: 24),
            const Text(
              'PROPIETARIO REGISTRADO',
              style: TextStyle(color: Colors.white54, fontSize: 11),
            ),
            const SizedBox(height: 4),
            Text(
              _duenioNombresController.text.isNotEmpty
                  ? _duenioNombresController.text
                  : 'Sin Propietario Asignado',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 15,
              ),
            ),
            if (_duenioDniController.text.trim().isNotEmpty &&
                _duenioDniController.text.trim() != 'S/D' &&
                !_duenioDniController.text.trim().startsWith('S/D')) ...[
              const SizedBox(height: 4),
              Text(
                'N° Doc/RUC: ${_duenioDniController.text}',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
            ],
            const Divider(color: Colors.white24, height: 24),
            const Text(
              'ASOCIACIÓN DEL VEHÍCULO',
              style: TextStyle(color: Colors.white54, fontSize: 11),
            ),
            const SizedBox(height: 4),
            Text(
              isFormal
                  ? (_vehiculoData?['asociacion'] ?? 'Vehículo Formal')
                  : 'Sin Asociación (Vehículo Informal)',
              style: TextStyle(
                color: isFormal ? Colors.cyanAccent : Colors.white70,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),

            const Divider(color: Colors.white24, height: 24),
            const Text(
              'ESTADO DE DOCUMENTOS',
              style: TextStyle(
                color: Colors.white54,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            ...allDocs.map((doc) {
              final String estado = (doc['estado'] ?? '').toString().toUpperCase();
              final bool isVigente = estado == 'VIGENTE';
              final bool isNoRegistrado = estado == 'NO REGISTRADO' || estado == 'SIN REGISTRO';
              final docColor = isVigente
                  ? Colors.greenAccent
                  : (isNoRegistrado ? Colors.orangeAccent : Colors.redAccent);
              return Padding(
                padding: const EdgeInsets.only(bottom: 6.0),
                child: Row(
                  children: [
                    Icon(
                      isVigente
                          ? Icons.verified
                          : (isNoRegistrado ? Icons.help_outline : Icons.warning_amber_rounded),
                      color: docColor,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${_formatTipoDocumento(doc['tipoDocumento'])}${doc['numero'] != null && doc['numero'] != 'null' ? ' - ${doc['numero']}' : (doc['codigo'] != null && doc['codigo'] != 'null' ? ' - ${doc['codigo']}' : '')}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    Text(
                      estado.replaceAll('_', ' '),
                      style: TextStyle(
                        color: docColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  String _formatTipoDocumento(String? tipo) {
    if (tipo == null) return 'Documento';
    switch (tipo.toUpperCase().trim()) {
      case 'TARJETA_OPERATIVIDAD':
        return 'Tarjeta de Operatividad';
      case 'TARJETA_PROPIEDAD':
        return 'Tarjeta de Propiedad';
      case 'SOAT':
        return 'SOAT';
      case 'CERTICAV':
        return 'CERTICAV';
      default:
        return tipo.replaceAll('_', ' ').split(' ').map((w) {
          if (w.isEmpty) return '';
          return w[0].toUpperCase() + w.substring(1).toLowerCase();
        }).join(' ');
    }
  }

  Widget _buildSummaryRow(
    String label1,
    String val1,
    String label2,
    String val2,
  ) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label1,
                style: const TextStyle(color: Colors.white54, fontSize: 11),
              ),
              const SizedBox(height: 2),
              Text(
                val1.isNotEmpty ? val1 : '-',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label2,
                style: const TextStyle(color: Colors.white54, fontSize: 11),
              ),
              const SizedBox(height: 2),
              Text(
                val2.isNotEmpty ? val2 : '-',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
