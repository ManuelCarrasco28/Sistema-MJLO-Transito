import 'dart:convert';
import 'package:flutter/material.dart';
import '../theme.dart';
import '../services/api_service.dart';
import 'register_alien_vehicle_screen.dart';
import 'history_screen.dart';
import 'vehicle_details_screen.dart';

class PersonDetailsScreen extends StatefulWidget {
  final String dni;
  const PersonDetailsScreen({super.key, required this.dni});

  @override
  State<PersonDetailsScreen> createState() => _PersonDetailsScreenState();
}

class _PersonDetailsScreenState extends State<PersonDetailsScreen> {
  bool _isLoading = true;
  bool _errorConsulta = false;
  bool _permitePapeleta = true;
  Map<String, dynamic>? _persona;
  List<dynamic> _vehiculos = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final p = await ApiService.getPersonaByDni(widget.dni);
      final v = await ApiService.getVehiculosByPersonaDni(widget.dni);
      final permite = await ApiService.permiteAplicarPapeletaMovil();
      if (mounted) {
        setState(() {
          _persona = p;
          _vehiculos = v;
          _permitePapeleta = permite;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorConsulta = true;
        });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Detalles de Persona', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), backgroundColor: AppTheme.primaryBlue, iconTheme: const IconThemeData(color: Colors.white)),
        body: const Center(child: CircularProgressIndicator(color: AppTheme.primaryBlue)),
      );
    }

    if (_persona == null && _errorConsulta) {
      return Scaffold(
        appBar: AppBar(title: const Text('Detalles de Persona', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), backgroundColor: AppTheme.primaryBlue, iconTheme: const IconThemeData(color: Colors.white)),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('No se pudo consultar. Verifique la conexión e intente de nuevo.', textAlign: TextAlign.center, style: TextStyle(fontSize: 16, color: Colors.grey)),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _isLoading = true;
                      _errorConsulta = false;
                    });
                    _loadData();
                  },
                  child: const Text('Reintentar'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_persona == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Detalles de Persona', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), backgroundColor: AppTheme.primaryBlue, iconTheme: const IconThemeData(color: Colors.white)),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Text(
              'Persona no registrada en el padrón municipal de JLO.', 
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Colors.grey)
            ),
          )
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: const Text('Detalles de Persona', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: AppTheme.primaryBlue,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
        padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 200.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildPhotoSection(),
            const SizedBox(height: 16),
            _buildSectionTitle('DATOS PERSONALES & DOCUMENTOS'),
            _buildInfoCard([
              _buildRow([
                _buildField('TIPO DE DOCUMENTO', _persona!['tipoDocumento']),
                _buildField('NÚMERO DE DOCUMENTO', _persona!['numeroDocumento']),
              ]),
              const Divider(height: 24, color: Colors.transparent),
              _buildRow([
                _buildField('NOMBRES', _persona!['nombres']),
              ]),
              const Divider(height: 24, color: Colors.transparent),
              _buildRow([
                _buildField('APELLIDO PATERNO', _persona!['apellidoPaterno']),
                _buildField('APELLIDO MATERNO', _persona!['apellidoMaterno']),
              ]),
            ]),
            const SizedBox(height: 16),
            _buildSectionTitle('LICENCIA DE CONDUCIR'),
            _buildInfoCard([
              _buildRow([
                _buildField('NÚMERO DE LICENCIA', _persona!['numeroLicencia']),
              ]),
            ]),
            const SizedBox(height: 16),
            _buildSectionTitle('CONTACTO Y ESTADO'),
            _buildInfoCard([
              _buildRow([
                _buildField('DIRECCIÓN', _persona!['direccion']),
              ]),
              const Divider(height: 24, color: Colors.transparent),
              _buildRow([
                _buildField('CORREO ELECTRÓNICO', _persona!['email']),
              ]),
              const Divider(height: 24, color: Colors.transparent),
              _buildRow([
                _buildField('TELÉFONO / CELULAR', _persona!['celular']?.isNotEmpty == true ? _persona!['celular'] : _persona!['telefono']),
                _buildField('ESTADO DEL REGISTRO', _persona!['estado'], isHighlight: true),
              ]),
            ]),
            if (_vehiculos.isNotEmpty) ...[
              const SizedBox(height: 24),
              _buildSectionTitle('VEHÍCULOS ASOCIADOS'),
              ..._vehiculos.map((v) => _buildVehicleCard(v)),
            ]
          ],
        ),
      ),
      Positioned(
        left: 0,
        right: 0,
        bottom: MediaQuery.of(context).padding.bottom + 16,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => HistoryScreen(filterDni: _persona!['numeroDocumento']),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 5,
                  ),
                  icon: const Icon(Icons.history),
                  label: const Text('Ver Historial de Actividades', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => RegisterAlienVehicleScreen(conductor: _persona!),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange.shade700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 5,
                  ),
                  icon: const Icon(Icons.car_crash),
                  label: Text(
                    _permitePapeleta ? 'Infracción a Vehículo Distinto' : 'Reportar Vehículo Distinto',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      ],
      ),
    );
  }

  String get _nombreCompleto {
    if (_persona == null) return '';
    final nombres = (_persona!['nombres'] ?? '').toString().trim();
    final paterno = (_persona!['apellidoPaterno'] ?? '').toString().trim();
    final materno = (_persona!['apellidoMaterno'] ?? '').toString().trim();
    final partes = [nombres, paterno, materno].where((p) => p.isNotEmpty).toList();
    if (partes.isNotEmpty) {
      return partes.join(' ');
    }
    return (_persona!['nombreCompleto'] ?? _persona!['nombre'] ?? '').toString().trim();
  }

  Widget _buildAvatarImage(String photoStr) {
    final placeholder = Container(
      color: Colors.white24,
      child: const Icon(Icons.person, size: 40, color: Colors.white),
    );

    if (photoStr.isEmpty) {
      return placeholder;
    }

    if (photoStr.startsWith('data:image') || (!photoStr.startsWith('http') && photoStr.length > 100)) {
      try {
        final base64Part = photoStr.contains(',') ? photoStr.split(',').last : photoStr;
        final bytes = base64Decode(base64Part);
        return Image.memory(
          bytes,
          width: 80,
          height: 80,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => placeholder,
        );
      } catch (_) {
        return placeholder;
      }
    }

    final photoFullUrl = ApiService.urlArchivo(photoStr);
    return Image.network(
      photoFullUrl,
      width: 80,
      height: 80,
      fit: BoxFit.cover,
      headers: ApiService.headersImagen,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return Container(
          color: Colors.white24,
          child: const Center(
            child: SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) => placeholder,
    );
  }

  Widget _buildLargeImage(String photoStr) {
    if (photoStr.isEmpty) {
      return const Icon(Icons.person, size: 80, color: Colors.white70);
    }

    if (photoStr.startsWith('data:image') || (!photoStr.startsWith('http') && photoStr.length > 100)) {
      try {
        final base64Part = photoStr.contains(',') ? photoStr.split(',').last : photoStr;
        final bytes = base64Decode(base64Part);
        return Image.memory(
          bytes,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) => const Icon(Icons.broken_image, size: 60, color: Colors.white70),
        );
      } catch (_) {
        return const Icon(Icons.broken_image, size: 60, color: Colors.white70);
      }
    }

    final photoFullUrl = ApiService.urlArchivo(photoStr);
    return Image.network(
      photoFullUrl,
      fit: BoxFit.contain,
      headers: ApiService.headersImagen,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return const Center(
          child: CircularProgressIndicator(color: Colors.white),
        );
      },
      errorBuilder: (context, error, stackTrace) => const Icon(Icons.broken_image, size: 60, color: Colors.white70),
    );
  }

  void _mostrarFotoEnGrande(BuildContext context, String photoStr, String nombre) {
    if (photoStr.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No hay fotografía disponible para ampliar.')),
      );
      return;
    }

    final docNum = _persona?['numeroDocumento']?.toString() ?? widget.dni;
    final tipoDoc = _persona?['tipoDocumento']?.toString() ?? 'DOCUMENTO';

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: const BoxDecoration(
                    color: AppTheme.primaryBlue,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.badge_outlined, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Fotografía de Identidad',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white, size: 22),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  child: Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        constraints: const BoxConstraints(
                          maxHeight: 320,
                          maxWidth: 240,
                        ),
                        child: InteractiveViewer(
                          panEnabled: true,
                          minScale: 0.8,
                          maxScale: 4.0,
                          child: _buildLargeImage(photoStr),
                        ),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Column(
                    children: [
                      Text(
                        nombre,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$tipoDoc: $docNum',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryBlue,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('Cerrar', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPhotoSection() {
    final photoRaw = _persona!['fotoUrl'] ?? _persona!['fotoImg'] ?? _persona!['foto'];
    final photoStr = photoRaw?.toString().trim() ?? '';
    final nombre = _nombreCompleto;
    final fontSize = nombre.length > 30 ? 15.0 : (nombre.length > 20 ? 17.0 : 19.0);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryBlue,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => _mostrarFotoEnGrande(context, photoStr, nombre),
            child: Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    width: 80,
                    height: 80,
                    child: _buildAvatarImage(photoStr),
                  ),
                ),
                if (photoStr.isNotEmpty)
                  Positioned(
                    bottom: 2,
                    right: 2,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.65),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Icon(Icons.zoom_in, color: Colors.white, size: 14),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Fotografía de la Persona Consultada',
                        style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                    if (photoStr.isNotEmpty)
                      const Icon(Icons.touch_app, size: 13, color: Colors.white60),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  nombre,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  softWrap: true,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: fontSize,
                    fontWeight: FontWeight.bold,
                    height: 1.15,
                  ),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4),
      child: Row(
        children: [
          const Icon(Icons.circle, size: 10, color: Colors.cyan),
          const SizedBox(width: 8),
          Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.cyan)),
        ],
      ),
    );
  }

  Widget _buildInfoCard(List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryBlue.withOpacity(0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildRow(List<Widget> children) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children.map((c) => Expanded(child: Padding(padding: const EdgeInsets.only(right: 8.0), child: c))).toList(),
    );
  }

  Widget _buildField(String label, dynamic value, {bool isHighlight = false}) {
    final strValue = (value == null || value.toString().isEmpty) ? '-' : value.toString();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade600)),
        const SizedBox(height: 4),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: isHighlight ? AppTheme.primaryBlue : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Text(
            strValue,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: isHighlight ? Colors.white : Colors.black87),
          ),
        ),
      ],
    );
  }

  Widget _buildVehicleCard(Map<String, dynamic> v) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => VehicleDetailsScreen(
              searchQuery: v['placa'] ?? '',
              searchType: 'PLACA',
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppTheme.primaryBlue.withOpacity(0.1), shape: BoxShape.circle),
              child: const Icon(Icons.directions_car, color: AppTheme.primaryBlue),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(v['placa'] ?? 'Sin Placa', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primaryBlue)),
                  const SizedBox(height: 4),
                  Text('${v['marca'] ?? ''} ${v['modelo'] ?? ''} - ${v['color'] ?? ''}', style: TextStyle(color: Colors.grey.shade700, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(v['asociacion'] ?? 'Independiente', style: const TextStyle(color: Colors.cyan, fontWeight: FontWeight.bold, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}
