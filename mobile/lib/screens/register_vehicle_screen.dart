import 'package:flutter/material.dart';
import 'issue_ticket_informal_screen.dart';

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

  // Vehículo
  String _estadoPlaca = 'CON_PLACA'; // 'CON_PLACA', 'SIN_PLACA'
  final _placaController = TextEditingController();

  // Características (Solo para Sin Placa)
  final _claseController = TextEditingController();
  final _marcaController = TextEditingController();
  final _colorController = TextEditingController();
  final _motorController = TextEditingController();

  void _continuarAMulta() {
    if (_dniConductor.text.isEmpty || _nombresConductor.text.isEmpty || _apellidosConductor.text.isEmpty) {
      _showError('Por favor completa los datos del conductor');
      return;
    }

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
            
            const Text('1. Datos del Conductor', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
            const SizedBox(height: 12),
            _buildTextField(_dniConductor, 'DNI del Conductor', Icons.badge, TextInputType.number),
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
              const Text('2. Datos del Dueño', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.orange)),
              _buildTextField(_dniDueno, 'DNI del Dueño', Icons.badge, TextInputType.number),
              const SizedBox(height: 12),
              _buildTextField(_nombresDueno, 'Nombres', Icons.person, TextInputType.name),
              const SizedBox(height: 12),
              _buildTextField(_apellidosDueno, 'Apellidos', Icons.person_outline, TextInputType.name),
            ],
            
            const SizedBox(height: 32),
            const Text('3. Datos del Vehículo', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
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
            if (_estadoPlaca == 'CON_PLACA')
              _buildTextField(_placaController, 'Número de Placa (Ej: M1-5678)', Icons.directions_car, TextInputType.text)
            else ...[
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
            
            const SizedBox(height: 40),
            SizedBox(
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
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Siguiente: Generar Multa', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
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
