import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme.dart';

class TechnicalInspectionScreen extends StatefulWidget {
  final Map<String, dynamic>? vehiculo;
  final Map<String, dynamic>? inspeccionAEditar;

  const TechnicalInspectionScreen({
    super.key,
    this.vehiculo,
    this.inspeccionAEditar,
  }) : assert(vehiculo != null || inspeccionAEditar != null, 'Debe proporcionar vehiculo o inspeccionAEditar');

  @override
  State<TechnicalInspectionScreen> createState() => _TechnicalInspectionScreenState();
}

class _TechnicalInspectionScreenState extends State<TechnicalInspectionScreen> {
  bool _isLoading = true;
  bool _isSending = false;
  bool get _esEdicion => widget.inspeccionAEditar != null;
  Timer? _timerTolerancia;
  int _segundosRestantes = 300;

  // Datos de Documento y Registro
  late String _placa;
  String _numeroRegistro = '';
  String _numeroSerieCerticav = '';
  late String _fechaInspeccion;

  // Datos de Vehículo y Transportador
  late String _marca;
  late String _modelo;
  late String _anio;
  late String _color;
  late String _serieMotor;
  late String _transportador;

  // Datos de Propietario, Conductor y Técnico
  late String _propietario;
  late String _propietarioDni;
  final TextEditingController _conductorController = TextEditingController();
  final TextEditingController _conductorDniController = TextEditingController();
  final TextEditingController _licenciaController = TextEditingController();
  final TextEditingController _inspectorController = TextEditingController();
  final TextEditingController _observacionesController = TextEditingController();

  bool _mismoPropietario = false;

  // Checklist
  List<Map<String, dynamic>> _criterios = [];
  final Map<int, String> _evaluaciones = {}; // criterioId -> 'BIEN' | 'MAL_ESTADO' | 'NO_TIENE'

  @override
  void initState() {
    super.initState();
    _initVehicleData();
    _loadCriterios();
    if (_esEdicion) {
      final segRaw = widget.inspeccionAEditar!['segundosRestantesTolerancia'];
      _segundosRestantes = int.tryParse(segRaw?.toString() ?? '') ?? 300;
      _timerTolerancia = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!mounted) return;
        if (_segundosRestantes > 0) {
          setState(() => _segundosRestantes--);
        } else {
          timer.cancel();
        }
      });
    }
  }

  @override
  void dispose() {
    _timerTolerancia?.cancel();
    _conductorController.dispose();
    _conductorDniController.dispose();
    _licenciaController.dispose();
    _inspectorController.dispose();
    _observacionesController.dispose();
    super.dispose();
  }

  String _formatearTiempo(int seg) {
    if (seg <= 0) return '00:00';
    final m = (seg ~/ 60).toString().padLeft(2, '0');
    final s = (seg % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  void _initVehicleData() {
    if (_esEdicion) {
      final edit = widget.inspeccionAEditar!;
      _placa = (edit['vehiculoPlaca'] ?? edit['placa'] ?? '').toString().toUpperCase();
      _marca = (edit['vehiculoMarca'] ?? edit['marca'] ?? '').toString().toUpperCase();
      _modelo = (edit['vehiculoModelo'] ?? edit['modelo'] ?? '').toString().toUpperCase();
      _anio = (edit['vehiculoAnio'] ?? edit['anio'] ?? '').toString();
      _color = (edit['vehiculoColor'] ?? edit['color'] ?? '').toString().toUpperCase();
      _serieMotor = (edit['vehiculoMotor'] ?? edit['serieMotor'] ?? '').toString().toUpperCase();
      _transportador = (edit['transportador'] ?? edit['asociacion'] ?? '').toString().toUpperCase();
      _propietario = (edit['propietario'] ?? '').toString().toUpperCase();
      _propietarioDni = (edit['propietarioDni'] ?? '').toString();
      _fechaInspeccion = (edit['fecha'] ?? DateTime.now().toIso8601String().split('T')[0]).toString();
      _numeroRegistro = (edit['numeroRegistro'] ?? edit['numeroInspeccion'] ?? '').toString();
      _numeroSerieCerticav = (edit['numeroSerieCerticav'] ?? '').toString();
      _conductorController.text = (edit['conductorNombre'] ?? '').toString();
      _conductorDniController.text = (edit['conductorDni'] ?? '').toString();
      _licenciaController.text = (edit['conductorLicencia'] ?? '').toString();
      _observacionesController.text = (edit['observaciones'] ?? '').toString();
      _inspectorController.text = (edit['inspector'] ?? '').toString();

      if (edit['detalles'] is List) {
        for (final d in edit['detalles']) {
          final cId = int.tryParse(d['criterioId']?.toString() ?? '');
          final st = d['estado']?.toString();
          if (cId != null && st != null) {
            _evaluaciones[cId] = st;
          }
        }
      }
      return;
    }

    final v = widget.vehiculo!;
    _placa = (v['placa']?.toString() ?? '').toUpperCase();
    _marca = (v['marca']?.toString() ?? '').toUpperCase();
    _modelo = (v['modelo']?.toString() ?? '').toUpperCase();
    _anio = (v['anio']?.toString() ?? '');
    _color = (v['color']?.toString() ?? '').toUpperCase();
    _serieMotor = (v['serieMotor']?.toString() ?? '').toUpperCase();
    _transportador = (v['asociacion']?.toString() ?? '').toUpperCase();

    _propietario = (v['propietario']?.toString() ?? '').toUpperCase();
    _propietarioDni = (v['propietarioDni']?.toString() ?? '');

    final now = DateTime.now();
    _fechaInspeccion = now.toIso8601String().split('T')[0];
    final numCorrelativo = (now.millisecondsSinceEpoch % 900 + 100).toString().padLeft(3, '0');
    _numeroRegistro = 'INSP-${now.year}-$numCorrelativo';
    _numeroSerieCerticav = (now.millisecondsSinceEpoch % 10000000).toString().padLeft(7, '0');

    _cargarNombreInspector();
  }

  Future<void> _cargarNombreInspector() async {
    final prefs = await SharedPreferences.getInstance();
    final nombres = prefs.getString('nombres') ?? '';
    final apellidos = prefs.getString('apellidos') ?? '';
    final nombreCompleto = '$nombres $apellidos'.trim();
    if (nombreCompleto.isNotEmpty && mounted) {
      setState(() {
        _inspectorController.text = nombreCompleto.toUpperCase();
      });
    }
  }

  Future<void> _loadCriterios() async {
    setState(() => _isLoading = true);
    try {
      final list = await ApiService.getInspeccionCriterios();
      if (mounted) {
        setState(() {
          _criterios = list;
          // Inicializar sin selección o listo
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al cargar criterios: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _onToggleMismoPropietario(bool? val) {
    setState(() {
      _mismoPropietario = val ?? false;
      if (_mismoPropietario) {
        _conductorController.text = _propietario;
        _conductorDniController.text = _propietarioDni;
      } else {
        _conductorController.clear();
        _conductorDniController.clear();
        _licenciaController.clear();
      }
    });
  }

  void _marcarTodoBien() {
    setState(() {
      for (final c in _criterios) {
        final id = c['id'] as int;
        _evaluaciones[id] = 'BIEN';
      }
    });
  }

  bool get _todosEnBien {
    if (_criterios.isEmpty) return false;
    if (_evaluaciones.length != _criterios.length) return false;
    return _evaluaciones.values.every((val) => val == 'BIEN');
  }

  String get _primeraEvaluacion {
    if (_evaluaciones.length != _criterios.length) return 'PENDIENTE';
    final hayFallo = _evaluaciones.values.any((val) => val == 'MAL_ESTADO' || val == 'NO_TIENE');
    return hayFallo ? 'DESAPROBADO' : 'APROBADO';
  }

  String get _resultadoFinal {
    return _primeraEvaluacion;
  }

  Widget _buildEvaluacionBadge(String status) {
    Color bg = const Color(0xFFFFF8E1);
    Color text = const Color(0xFFF57F17);
    Color dot = const Color(0xFFFBC02D);

    if (status == 'APROBADO') {
      bg = const Color(0xFFE8F5E9);
      text = const Color(0xFF1B5E20);
      dot = const Color(0xFF2E7D32);
    } else if (status == 'DESAPROBADO') {
      bg = const Color(0xFFFFEBEE);
      text = const Color(0xFFB71C1C);
      dot = const Color(0xFFC62828);
    } else if (status == 'OBSERVADO') {
      bg = const Color(0xFFFFF3E0);
      text = const Color(0xFFE65100);
      dot = const Color(0xFFEF6C00);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: dot.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            status,
            style: TextStyle(
              color: text,
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _guardarInspeccion() async {
    // Validar conductor
    final conductor = _conductorController.text.trim();
    final dniCond = _conductorDniController.text.trim();
    final inspector = _inspectorController.text.trim();

    if (conductor.isEmpty) {
      _mostrarMensaje('Ingrese el nombre del conductor.', isError: true);
      return;
    }
    if (dniCond.isNotEmpty && dniCond.length < 8) {
      _mostrarMensaje('El DNI del conductor debe tener al menos 8 dígitos.', isError: true);
      return;
    }
    if (inspector.isEmpty) {
      _mostrarMensaje('El nombre del inspector técnico es obligatorio.', isError: true);
      return;
    }

    // Validar checklist completo
    if (_evaluaciones.length < _criterios.length) {
      final faltantes = _criterios.length - _evaluaciones.length;
      _mostrarMensaje('Debe evaluar todos los ítems del checklist ($faltantes pendientes). Puede usar el botón "Todo bien".', isError: true);
      return;
    }

    if (_esEdicion && _segundosRestantes <= 0) {
      _mostrarMensaje('El tiempo de tolerancia de 5 minutos ha expirado. Ya no se pueden realizar modificaciones.', isError: true);
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(_esEdicion ? Icons.edit_note_rounded : Icons.assignment_turned_in, color: AppTheme.primaryBlue),
            const SizedBox(width: 8),
            Flexible(child: Text(
              _esEdicion ? 'Modificar Inspección' : 'Enviar Inspección',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
            )),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _esEdicion
                  ? '¿Desea actualizar y guardar los cambios de la inspección técnica del vehículo $_placa?'
                  : '¿Desea enviar la inspección técnica del vehículo $_placa?',
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF8E1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFFE082)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 20, color: Color(0xFFF57F17)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _esEdicion
                          ? 'Se actualizarán los datos de la inspección técnica dentro del tiempo de tolerancia permitido.'
                          : 'Se registrará y oficializará directamente la inspección técnica CERTICAV aprobada en el sistema.',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF5D4037)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        actions: [
          Row(
            children: [
              Expanded(
                flex: 2,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    side: BorderSide(color: Colors.grey.shade300),
                  ),
                  child: const Text('Cancelar', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 3,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryBlue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      _esEdicion ? 'Sí, Guardar Cambios' : 'Sí, Registrar Inspección',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isSending = true);

    try {
      final detallesPayload = _criterios.map((c) {
        final id = c['id'] as int;
        return {
          'criterioId': id,
          'estado': _evaluaciones[id] ?? 'BIEN',
          'obs': '',
        };
      }).toList();

      final payload = {
        'vehiculoPlaca': _placa,
        'numeroRegistro': _numeroRegistro,
        'numeroSerieCerticav': _numeroSerieCerticav,
        'fecha': _fechaInspeccion,
        'conductorNombre': conductor,
        'conductorDni': dniCond,
        'conductorLicencia': _licenciaController.text.trim(),
        'inspector': inspector,
        'mismoPropietario': _mismoPropietario,
        'observaciones': _observacionesController.text.trim(),
        'detalles': detallesPayload,
      };

      final Map<String, dynamic> response;
      if (_esEdicion) {
        final int idInsp = int.parse(widget.inspeccionAEditar!['id'].toString());
        response = await ApiService.modificarInspeccionTecnica(idInsp, payload);
      } else {
        response = await ApiService.enviarInspeccionTecnica(payload);
      }

      if (mounted) {
        setState(() => _isSending = false);
        _mostrarExitoDialog(response['message'] ?? (_esEdicion ? 'Inspección técnica modificada con éxito.' : 'Inspección técnica enviada con éxito.'));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSending = false);
        _mostrarMensaje(e.toString().replaceAll('Exception: ', ''), isError: true);
      }
    }
  }

  void _mostrarMensaje(String texto, {bool isError = false}) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(texto),
        backgroundColor: isError ? Colors.red.shade700 : Colors.green.shade700,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _mostrarExitoDialog(String mensaje) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFFE8F5E9),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle, color: Color(0xFF2E7D32), size: 54),
            ),
            const SizedBox(height: 18),
            Text(
              _esEdicion ? '¡Inspección Modificada!' : '¡Inspección Registrada!',
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 19),
            ),
            const SizedBox(height: 8),
            Text(
              _esEdicion
                  ? 'Los cambios a la inspección técnica del vehículo $_placa se guardaron con éxito dentro de la tolerancia de 5 minutos.'
                  : 'La inspección técnica del vehículo $_placa fue registrada y aprobada exitosamente como oficial.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: Color(0xFF555555)),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF4F6F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'N° Registro: $_numeroRegistro\nN° Serie: $_numeroSerieCerticav',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryBlue,
                ),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context, true);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryBlue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                ),
                child: const Text('Entendido y Finalizar'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Secciones
  Widget _buildSeccionContainer({required String titulo, required Widget child}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: AppTheme.primaryBlue,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                titulo.toUpperCase(),
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                  letterSpacing: 0.8,
                  color: AppTheme.primaryBlue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _buildReadOnlyField(String label, String valor, {Color? valorColor, bool isMonospace = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade500,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            valor.isNotEmpty ? valor : '—',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: valorColor ?? const Color(0xFF1E293B),
              fontFamily: isMonospace ? 'monospace' : null,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInput(String label, TextEditingController controller, {bool readOnly = false, String? hint, int maxLines = 1, TextInputType? keyboardType}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          readOnly: readOnly,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: readOnly ? Colors.grey.shade600 : Colors.black87,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 12),
            filled: true,
            fillColor: readOnly ? const Color(0xFFF8F9FA) : Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppTheme.primaryBlue, width: 2),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryBlue),
        ),
      );
    }

    // Agrupación de criterios por sección
    final Map<String, List<Map<String, dynamic>>> seccionesMap = {};
    for (final c in _criterios) {
      final sec = (c['seccion']?.toString() ?? 'GENERAL').toUpperCase();
      seccionesMap.putIfAbsent(sec, () => []).add(c);
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F9),
      appBar: AppBar(
        title: Text(
          _esEdicion ? 'Modificar Inspección CERTICAV' : 'Nueva Inspección CERTICAV',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
        ),
        backgroundColor: AppTheme.primaryBlue,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_esEdicion)
                    Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: _segundosRestantes > 0 ? const Color(0xFFFFF3E0) : const Color(0xFFFFEBEE),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: _segundosRestantes > 0 ? const Color(0xFFFFB74D) : const Color(0xFFEF5350),
                          width: 1.5,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: _segundosRestantes > 0 ? const Color(0xFFFFE0B2) : const Color(0xFFFFCDD2),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              _segundosRestantes > 0 ? Icons.timer_outlined : Icons.timer_off_outlined,
                              color: _segundosRestantes > 0 ? const Color(0xFFE65100) : const Color(0xFFC62828),
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _segundosRestantes > 0
                                      ? 'TOLERANCIA ACTIVA (5 MINUTOS)'
                                      : 'TOLERANCIA EXPIRADA',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5,
                                    color: _segundosRestantes > 0 ? const Color(0xFFE65100) : const Color(0xFFC62828),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _segundosRestantes > 0
                                      ? 'Tiempo restante para corregir: ${_formatearTiempo(_segundosRestantes)}'
                                      : 'Han pasado más de 5 minutos. Ya no se pueden realizar cambios.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: _segundosRestantes > 0 ? const Color(0xFFBF360C) : const Color(0xFFB71C1C),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  _buildSeccionContainer(
                    titulo: 'Documento y Registro',
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: _buildReadOnlyField(
                                'N° de Placa',
                                _placa,
                                valorColor: const Color(0xFF0D47A1),
                                isMonospace: true,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              flex: 4,
                              child: _buildReadOnlyField(
                                'N° de Registro',
                                _numeroRegistro,
                                isMonospace: true,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: _buildReadOnlyField(
                                'N° Serie CERTICAV',
                                _numeroSerieCerticav,
                                valorColor: const Color(0xFFD32F2F),
                                isMonospace: true,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildReadOnlyField(
                                'Fecha de Inspección',
                                _fechaInspeccion,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  _buildSeccionContainer(
                    titulo: 'Vehículo y Transportador',
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(child: _buildReadOnlyField('Marca', _marca)),
                            const SizedBox(width: 8),
                            Expanded(child: _buildReadOnlyField('Modelo', _modelo)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(child: _buildReadOnlyField('Año Fabricación', _anio, isMonospace: true)),
                            const SizedBox(width: 8),
                            Expanded(child: _buildReadOnlyField('Color', _color)),
                            const SizedBox(width: 8),
                            Expanded(child: _buildReadOnlyField('N° Motor', _serieMotor, isMonospace: true)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        _buildReadOnlyField('Razón Social Transportador (Empresa/Asoc.)', _transportador),
                      ],
                    ),
                  ),

                  _buildSeccionContainer(
                    titulo: 'Propietario, Conductor y Técnico',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE0F2FE),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFBAE6FD)),
                          ),
                          child: Row(
                            children: [
                              Checkbox(
                                value: _mismoPropietario,
                                onChanged: _onToggleMismoPropietario,
                                activeColor: const Color(0xFF0284C7),
                              ),
                              const Expanded(
                                child: Text(
                                  'El conductor es el mismo propietario',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                    color: Color(0xFF0369A1),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: _buildReadOnlyField('Propietario', _propietario),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              flex: 2,
                              child: _buildReadOnlyField('DNI Propietario', _propietarioDni, isMonospace: true),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),

                        Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: _buildInput(
                                'Conductor *',
                                _conductorController,
                                readOnly: _mismoPropietario,
                                hint: 'Nombre y apellidos',
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              flex: 2,
                              child: _buildInput(
                                'DNI Conductor',
                                _conductorDniController,
                                readOnly: _mismoPropietario,
                                keyboardType: TextInputType.number,
                                hint: '8 dígitos',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),

                        Row(
                          children: [
                            Expanded(
                              child: _buildInput(
                                'N° Licencia de Conductor',
                                _licenciaController,
                                hint: 'Ej: Q12345678',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),

                        _buildInput(
                          'Inspector Técnico Responsable *',
                          _inspectorController,
                          hint: 'Nombre del inspector responsable',
                        ),
                      ],
                    ),
                  ),

                  _buildSeccionContainer(
                    titulo: 'Checklist Técnico CERTICAV',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8F9FA),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.grey.shade300),
                              ),
                              child: const Row(
                                children: [
                                  Text('B: Bien', style: TextStyle(color: Color(0xFF2E7D32), fontWeight: FontWeight.bold, fontSize: 10)),
                                  SizedBox(width: 6),
                                  Text('·', style: TextStyle(color: Colors.grey)),
                                  SizedBox(width: 6),
                                  Text('M.E.: Mal', style: TextStyle(color: Color(0xFFE65100), fontWeight: FontWeight.bold, fontSize: 10)),
                                  SizedBox(width: 6),
                                  Text('·', style: TextStyle(color: Colors.grey)),
                                  SizedBox(width: 6),
                                  Text('N.T.: No tiene', style: TextStyle(color: Color(0xFFC62828), fontWeight: FontWeight.bold, fontSize: 10)),
                                ],
                              ),
                            ),
                            InkWell(
                              onTap: _marcarTodoBien,
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: _todosEnBien ? const Color(0xFFE8F5E9) : Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFF4CAF50), width: 1.5),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      _todosEnBien ? Icons.check_box : Icons.check_box_outline_blank,
                                      size: 16,
                                      color: const Color(0xFF2E7D32),
                                    ),
                                    const SizedBox(width: 4),
                                    const Text(
                                      'Todo bien',
                                      style: TextStyle(
                                        color: Color(0xFF2E7D32),
                                        fontWeight: FontWeight.w900,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        ...seccionesMap.entries.map((entry) {
                          final secNombre = entry.key;
                          final items = entry.value;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  decoration: BoxDecoration(
                                    border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            width: 6,
                                            height: 6,
                                            decoration: const BoxDecoration(
                                              color: Color(0xFF4F46E5),
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            secNombre,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: 0.5,
                                              color: Color(0xFF4F46E5),
                                            ),
                                          ),
                                        ],
                                      ),
                                      Text(
                                        '${items.length} ítems',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey.shade400,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 8),

                                ...items.map((crit) {
                                  final id = crit['id'] as int;
                                  final codigo = crit['codigo']?.toString() ?? '';
                                  final nombre = crit['nombre']?.toString() ?? '';
                                  final estado = _evaluaciones[id] ?? '';

                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 6),
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFAFAFA),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.grey.shade200),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFEEF2FF),
                                            borderRadius: BorderRadius.circular(4),
                                            border: Border.all(color: const Color(0xFFC7D2FE)),
                                          ),
                                          child: Text(
                                            codigo,
                                            style: const TextStyle(
                                              fontFamily: 'monospace',
                                              fontSize: 9,
                                              fontWeight: FontWeight.w900,
                                              color: Color(0xFF4338CA),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),

                                        Expanded(
                                          child: Text(
                                            nombre,
                                            style: const TextStyle(
                                              fontSize: 11.5,
                                              fontWeight: FontWeight.w600,
                                              color: Color(0xFF334155),
                                            ),
                                          ),
                                        ),

                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            _buildOptionBtn(id, 'BIEN', 'B', estado == 'BIEN', const Color(0xFF10B981)),
                                            const SizedBox(width: 4),
                                            _buildOptionBtn(id, 'MAL_ESTADO', 'M.E.', estado == 'MAL_ESTADO', const Color(0xFFF59E0B)),
                                            const SizedBox(width: 4),
                                            _buildOptionBtn(id, 'NO_TIENE', 'N.T.', estado == 'NO_TIENE', const Color(0xFFEF4444)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  );
                                }),
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
                  ),

                  _buildSeccionContainer(
                    titulo: 'Dictamen Final',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'PRIMERA EVALUACIÓN',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade500),
                                  ),
                                  const SizedBox(height: 4),
                                  _buildEvaluacionBadge(_primeraEvaluacion),
                                ],
                              ),
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'RESULTADO FINAL',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade500),
                                  ),
                                  const SizedBox(height: 4),
                                  _buildEvaluacionBadge(_resultadoFinal),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        _buildInput(
                          'Observaciones (Opcional)',
                          _observacionesController,
                          maxLines: 3,
                          hint: 'Detalles u observaciones técnicas del vehículo...',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 10,
                  offset: const Offset(0, -3),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _isSending ? null : _guardarInspeccion,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryBlue,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: _isSending
                        ? Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              ),
                              const SizedBox(width: 10),
                              Text(_esEdicion ? 'Guardando Cambios...' : 'Registrando Inspección...', style: const TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(_esEdicion ? Icons.save_rounded : Icons.verified_rounded, size: 18),
                              const SizedBox(width: 8),
                              Text(
                                _esEdicion
                                    ? 'Guardar Cambios de Inspección'
                                    : 'Guardar y Aprobar Inspección Técnica',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOptionBtn(int criterioId, String value, String label, bool isSelected, Color activeColor) {
    return InkWell(
      onTap: () {
        setState(() {
          _evaluaciones[criterioId] = value;
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: activeColor.withOpacity(0.35),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: isSelected ? Colors.white : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }
}
