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
        setState(() => _isLoading = false);
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

  Widget _buildPhotoSection() {
    final hasPhoto = _persona!['fotoUrl'] != null && _persona!['fotoUrl'].toString().isNotEmpty;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryBlue,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(12),
              image: hasPhoto ? DecorationImage(image: NetworkImage('${ApiService.fileBaseUrl}/${_persona!['fotoUrl']}'), fit: BoxFit.cover) : null,
            ),
            child: !hasPhoto ? const Icon(Icons.person, size: 40, color: Colors.white) : null,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Fotografía de la Persona Consultada', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('${_persona!['nombres']} ${_persona!['apellidoPaterno']}', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
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
