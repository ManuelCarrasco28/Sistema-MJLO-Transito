import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'issue_ticket_informal_screen.dart';
import 'fuga_capture_screen.dart';

class RegisterVehicleScreen extends StatefulWidget {
  const RegisterVehicleScreen({super.key});

  @override
  State<RegisterVehicleScreen> createState() => _RegisterVehicleScreenState();
}

class _RegisterVehicleScreenState extends State<RegisterVehicleScreen> {
  // Conductor
  final _dniConductor = TextEditingController();
  final _nombresConductor = TextEditingController();
  final _apellidosConductor = TextEditingController();
  
  // Dueño
  bool _conductorEsDueno = true;
  final _dniDueno = TextEditingController();
  final _nombresDueno = TextEditingController();
  final _apellidosDueno = TextEditingController();
  
  bool _conductorFugo = false;

  // Vehículo
  String _estadoPlaca = 'CON_PLACA'; // 'CON_PLACA', 'SIN_PLACA'
  final _placaController = TextEditingController();

  // Características (Solo para Sin Placa)
  final _claseController = TextEditingController();
  final _marcaController = TextEditingController();
  final _colorController = TextEditingController();
  final _motorController = TextEditingController();

  void _continuarAMulta() {
    if (_estadoPlaca == 'CON_PLACA' && _placaController.text.isEmpty) {
      _showError('Ingresa la placa del vehículo');
      return;
    }

    if (_estadoPlaca == 'SIN_PLACA' && (_claseController.text.isEmpty || _motorController.text.isEmpty)) {
      _showError('Ingresa la clase del vehículo y el código de motor (Obligatorio)');
      return;
    }

    final Map<String, dynamic> reporteData = {
      'dni_conductor': _dniConductor.text.trim(),
      'nombres_conductor': _nombresConductor.text.trim().toUpperCase(),
      'apellidos_conductor': _apellidosConductor.text.trim().toUpperCase(),
      'conductor_es_dueno': _conductorEsDueno,
      'dni_dueno': _conductorEsDueno ? _dniConductor.text.trim() : _dniDueno.text.trim(),
      'nombres_dueno': _conductorEsDueno ? _nombresConductor.text.trim().toUpperCase() : _nombresDueno.text.trim().toUpperCase(),
      'apellidos_dueno': _conductorEsDueno ? _apellidosConductor.text.trim().toUpperCase() : _apellidosDueno.text.trim().toUpperCase(),
      'estado_placa': _estadoPlaca,
      'placa': _estadoPlaca == 'CON_PLACA' ? _placaController.text.trim().toUpperCase() : null,
      'chasis': null,
      'clase_vehiculo': _claseController.text.trim().toUpperCase(),
      'marca_vehiculo': _marcaController.text.trim().toUpperCase(),
      'color_vehiculo': _colorController.text.trim().toUpperCase(),
      'motor_vehiculo': _motorController.text.trim().toUpperCase(),
    };

    if (_estadoPlaca == 'SIN_PLACA' && _conductorFugo) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => FugaCaptureScreen(reporteBaseData: reporteData),
        ),
      );
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => IssueTicketInformalScreen(reporteData: reporteData),
        ),
      );
    }
  }

  bool _isSearching = false;

  Future<void> _searchPersona(TextEditingController dniCtrl, TextEditingController nomCtrl, TextEditingController apeCtrl) async {
    final dni = dniCtrl.text.trim();
    if (dni.isEmpty) {
      _showError('Ingrese un DNI para buscar');
      return;
    }

    setState(() => _isSearching = true);
    try {
      final persona = await ApiService.getPersonaByDni(dni);
      if (persona != null) {
        setState(() {
          nomCtrl.text = persona['nombres'] ?? '';
          apeCtrl.text = '${persona['apellidoPaterno'] ?? ''} ${persona['apellidoMaterno'] ?? ''}'.trim();
        });
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Datos encontrados'), backgroundColor: Colors.green));
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Persona no encontrada. Puede ingresar los datos manualmente.'), backgroundColor: Colors.orange));
        nomCtrl.clear();
        apeCtrl.clear();
      }
    } catch (e) {
      _showError('Error al buscar persona: $e');
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  void _showError(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
    }
  }

  @override
  void dispose() {
    _dniConductor.dispose();
    _nombresConductor.dispose();
    _apellidosConductor.dispose();
    _dniDueno.dispose();
    _nombresDueno.dispose();
    _apellidosDueno.dispose();
    _placaController.dispose();
    _claseController.dispose();
    _marcaController.dispose();
    _colorController.dispose();
    _motorController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Reporte Informal', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E3A8A),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 24),
            
            const Text('1. Datos del Conductor (Opcional)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
            const SizedBox(height: 12),
            _buildTextField(_dniConductor, 'DNI del Conductor', Icons.badge, TextInputType.number, hasSearch: true, onSearch: () => _searchPersona(_dniConductor, _nombresConductor, _apellidosConductor)),
            const SizedBox(height: 12),
            _buildTextField(_nombresConductor, 'Nombres', Icons.person, TextInputType.name),
            const SizedBox(height: 12),
            _buildTextField(_apellidosConductor, 'Apellidos', Icons.person_outline, TextInputType.name),
            
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(12)),
              child: SwitchListTile(
                title: const Text('El conductor es también el DUEÑO del vehículo', style: TextStyle(fontWeight: FontWeight.bold)),
                value: _conductorEsDueno,
                activeColor: const Color(0xFF1E3A8A),
                onChanged: (val) => setState(() => _conductorEsDueno = val),
              ),
            ),
            
            if (!_conductorEsDueno) ...[
              const SizedBox(height: 24),
              const Text('2. Datos del Dueño (Opcional)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.orange)),
              _buildTextField(_dniDueno, 'DNI del Dueño', Icons.badge, TextInputType.number, hasSearch: true, onSearch: () => _searchPersona(_dniDueno, _nombresDueno, _apellidosDueno)),
              const SizedBox(height: 12),
              _buildTextField(_nombresDueno, 'Nombres', Icons.person, TextInputType.name),
              const SizedBox(height: 12),
              _buildTextField(_apellidosDueno, 'Apellidos', Icons.person_outline, TextInputType.name),
            ],
            
            const SizedBox(height: 32),
            const Text('3. Datos del Vehículo y Detención', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
            const SizedBox(height: 12),
            
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
              child: SwitchListTile(
                title: const Text('El conductor se dio a la FUGA', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                value: _conductorFugo,
                activeColor: Colors.red,
                onChanged: (val) => setState(() => _conductorFugo = val),
              ),
            ),
            const SizedBox(height: 16),
            
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                children: [
                  RadioListTile<String>(
                    title: const Text('Tiene Placa', style: TextStyle(fontWeight: FontWeight.w600)),
                    value: 'CON_PLACA',
                    groupValue: _estadoPlaca,
                    onChanged: (val) => setState(() => _estadoPlaca = val!),
                  ),
                  const Divider(height: 1),
                  RadioListTile<String>(
                    title: const Text('Sin Placa (Informal)', style: TextStyle(fontWeight: FontWeight.w600)),
                    value: 'SIN_PLACA',
                    groupValue: _estadoPlaca,
                    onChanged: (val) => setState(() => _estadoPlaca = val!),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            const SizedBox(height: 16),
            if (_estadoPlaca == 'CON_PLACA')
              _buildTextField(_placaController, 'Número de Placa (Ej: M1-5678)', Icons.directions_car, TextInputType.text)
            else if (_conductorFugo) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.amber.shade300)),
                child: const Row(
                  children: [
                    Icon(Icons.warning, color: Colors.orange, size: 32),
                    SizedBox(width: 12),
                    Expanded(child: Text('Como el vehículo no tiene placa y el conductor se dio a la fuga, deberá tomar capturas fotográficas en el siguiente paso.', style: TextStyle(color: Colors.brown))),
                  ],
                ),
              ),
            ] else ...[
              const Padding(
                padding: EdgeInsets.only(bottom: 8.0),
                child: Text('Características del Vehículo', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
              ),
              _buildTextField(_claseController, 'Clase (Ej: Mototaxi)', Icons.category, TextInputType.text),
              const SizedBox(height: 12),
              _buildTextField(_marcaController, 'Marca', Icons.branding_watermark, TextInputType.text),
              const SizedBox(height: 12),
              _buildTextField(_colorController, 'Color', Icons.color_lens, TextInputType.text),
              const SizedBox(height: 12),
              _buildTextField(_motorController, 'Código de Motor', Icons.settings, TextInputType.text),
            ],
            
            const SizedBox(height: 16),
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
              onPressed: _continuarAMulta,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade700,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 5,
              ),
              icon: _estadoPlaca == 'SIN_PLACA' && _conductorFugo ? const Icon(Icons.camera_alt) : const Icon(Icons.arrow_forward),
              label: Text(
                _estadoPlaca == 'SIN_PLACA' && _conductorFugo ? 'Tomar Capturas y GPS' : 'Siguiente: Generar Multa',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, TextInputType type, {bool hasSearch = false, VoidCallback? onSearch}) {
    return TextField(
      controller: controller,
      keyboardType: type,
      textCapitalization: TextCapitalization.characters,
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
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  child: _isSearching 
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) 
                      : const Text('Buscar', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              )
            : null,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.white,
      ),
    );
  }
}
