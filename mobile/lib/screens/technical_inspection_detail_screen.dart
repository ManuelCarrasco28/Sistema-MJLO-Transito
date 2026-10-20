import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../utils/download_helper.dart';
import 'technical_inspection_screen.dart';
import 'pdf_viewer_screen.dart';

class TechnicalInspectionDetailScreen extends StatefulWidget {
  final Map<String, dynamic> inspeccion;

  const TechnicalInspectionDetailScreen({
    super.key,
    required this.inspeccion,
  });

  @override
  State<TechnicalInspectionDetailScreen> createState() => _TechnicalInspectionDetailScreenState();
}

class _TechnicalInspectionDetailScreenState extends State<TechnicalInspectionDetailScreen> {
  late Map<String, dynamic> _inspeccion;
  Timer? _timer;
  int _segundosRestantes = 0;

  @override
  void initState() {
    super.initState();
    _inspeccion = Map<String, dynamic>.from(widget.inspeccion);
    final segRaw = _inspeccion['segundosRestantesTolerancia'];
    _segundosRestantes = int.tryParse(segRaw?.toString() ?? '') ?? 0;

    if (_segundosRestantes > 0) {
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
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
    _timer?.cancel();
    super.dispose();
  }

  String _formatearTiempo(int seg) {
    if (seg <= 0) return '00:00';
    final m = (seg ~/ 60).toString().padLeft(2, '0');
    final s = (seg % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<void> _abrirEdicion() async {
    final res = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => TechnicalInspectionScreen(
          inspeccionAEditar: {
            ..._inspeccion,
            'segundosRestantesTolerancia': _segundosRestantes,
          },
        ),
      ),
    );

    if (res == true && mounted) {
      Navigator.pop(context, true);
    }
  }

  void _verCerticavPdf() {
    final id = _inspeccion['id'];
    if (id == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se encontró el identificador de la inspección.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final registro = _inspeccion['numeroRegistro']?.toString() ?? 'CERTICAV';
    final pdfUrl = '${ApiService.baseUrl}/mobile/inspecciones/$id/pdf';

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PdfViewerScreen(
          title: 'Ficha CERTICAV $registro',
          subtitle: 'Documento Oficial A4',
          pdfUrl: pdfUrl,
        ),
      ),
    );
  }

  Future<void> _descargarCerticavDirecto() async {
    final id = _inspeccion['id'];
    if (id == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se encontró el identificador de la inspección.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final registro = _inspeccion['numeroRegistro']?.toString() ?? 'CERTICAV';
    final sanitizedRegistro = registro.replaceAll(RegExp(r'[^\w\s\.-]'), '_').replaceAll(' ', '_');
    final nombreArchivo = 'Ficha_CERTICAV_$sanitizedRegistro.pdf';
    final pdfUrl = '${ApiService.baseUrl}/mobile/inspecciones/$id/pdf';

    await DownloadHelper.descargarYGuardar(
      context,
      url: pdfUrl,
      nombreArchivo: nombreArchivo,
    );
  }

  Widget _buildStatusBadge(String status) {
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
          Container(width: 7, height: 7, decoration: BoxDecoration(color: dot, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(
            status,
            style: TextStyle(color: text, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
          ),
        ],
      ),
    );
  }

  Widget _buildField(String label, String valor, {Color? valorColor, bool isMonospace = false}) {
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
            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Colors.grey.shade500),
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

  Widget _buildCard({required String title, required Widget child}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.8, color: AppTheme.primaryBlue),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final placa = _inspeccion['vehiculoPlaca']?.toString() ?? '—';
    final registro = _inspeccion['numeroRegistro']?.toString() ?? '—';
    final serie = _inspeccion['numeroSerieCerticav']?.toString() ?? '—';
    final fecha = _inspeccion['fecha']?.toString() ?? '—';
    final estado = _inspeccion['estado']?.toString() ?? 'ACTIVO';
    final resultado = _inspeccion['resultado']?.toString() ?? 'APROBADO';
    final inspector = _inspeccion['inspector']?.toString() ?? 'Inspector Técnico';
    final observaciones = _inspeccion['observaciones']?.toString() ?? '';
    final conductor = _inspeccion['conductorNombre']?.toString() ?? '—';
    final conductorDni = _inspeccion['conductorDni']?.toString() ?? '—';
    final licencia = _inspeccion['conductorLicencia']?.toString() ?? '—';
    final marca = _inspeccion['vehiculoMarca']?.toString() ?? '';
    final modelo = _inspeccion['vehiculoModelo']?.toString() ?? '';
    final transportador = _inspeccion['transportador']?.toString() ?? '—';

    final detallesRaw = _inspeccion['detalles'];
    final List<dynamic> detalles = detallesRaw is List ? detallesRaw : [];

    final bool puedeModificar = estado != 'ANULADA' && _segundosRestantes > 0;
    final bool esAprobado = resultado == 'APROBADO' && estado != 'ANULADA';

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F9),
      appBar: AppBar(
        title: Text('Ficha CERTICAV $registro', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: AppTheme.primaryBlue,
        elevation: 0,
        actions: [
          if (esAprobado)
            IconButton(
              icon: const Icon(Icons.download_rounded),
              tooltip: 'Descargar Documento CERTICAV (PDF)',
              onPressed: _descargarCerticavDirecto,
            ),
          if (puedeModificar)
            IconButton(
              icon: const Icon(Icons.edit_note_rounded),
              tooltip: 'Modificar inspección',
              onPressed: _abrirEdicion,
            ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(16, 16, 16, 24 + MediaQuery.of(context).padding.bottom),
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (puedeModificar)
                Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFFF8E1), Color(0xFFFFECB3)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFFFB74D), width: 1.5),
                    boxShadow: [
                      BoxShadow(color: const Color(0xFFF57F17).withOpacity(0.08), blurRadius: 10, offset: const Offset(0, 3)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              color: Color(0xFFFFF3E0),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.timer_outlined, color: Color(0xFFE65100), size: 22),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'PERÍODO DE TOLERANCIA ACTIVO',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5,
                                    color: Color(0xFFE65100),
                                  ),
                                ),
                                Text(
                                  'Tiempo restante para corregir: ${_formatearTiempo(_segundosRestantes)}',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFFBF360C),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Tienes 5 minutos de tolerancia para corregir cualquier dato si te equivocaste al registrar.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF6D4C41)),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _abrirEdicion,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE65100),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            minimumSize: const Size.fromHeight(48),
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.edit_note_rounded, size: 20),
                          label: const FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              'Modificar / Corregir Inspección',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              if (esAprobado)
                Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _verCerticavPdf,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7C3AED),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                      minimumSize: const Size.fromHeight(50),
                      elevation: 1,
                      shadowColor: const Color(0xFF7C3AED).withOpacity(0.35),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.description_rounded, size: 22),
                    label: const FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        'Ver Documento CERTICAV (PDF)',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ),
                  ),
                ),

              // Estado y Dictamen
              Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: const Color(0xFF81C784),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 3)),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: const Color(0xFFA5D6A7),
                            ),
                          ),
                          child: const Text(
                            'OFICIAL / REGISTRADO',
                            style: TextStyle(
                              color: Color(0xFF1B5E20),
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        _buildStatusBadge(resultado),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Divider(height: 1),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _buildField('N° Registro', registro, isMonospace: true)),
                        const SizedBox(width: 8),
                        Expanded(child: _buildField('Serie CERTICAV', serie, isMonospace: true)),
                        const SizedBox(width: 8),
                        Expanded(child: _buildField('Fecha', fecha)),
                      ],
                    ),
                  ],
                ),
              ),

              // Datos del Vehículo
              _buildCard(
                title: 'Datos del Vehículo',
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(child: _buildField('Placa', placa, valorColor: const Color(0xFF0D47A1), isMonospace: true)),
                        const SizedBox(width: 8),
                        Expanded(child: _buildField('Marca', marca)),
                        const SizedBox(width: 8),
                        Expanded(child: _buildField('Modelo', modelo)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _buildField('Empresa / Transportador', transportador),
                  ],
                ),
              ),

              // Datos del Conductor e Inspector
              _buildCard(
                title: 'Conductor e Inspector',
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(flex: 3, child: _buildField('Conductor', conductor)),
                        const SizedBox(width: 8),
                        Expanded(flex: 2, child: _buildField('DNI', conductorDni, isMonospace: true)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(child: _buildField('Licencia', licencia, isMonospace: true)),
                        const SizedBox(width: 8),
                        Expanded(child: _buildField('Inspector', inspector)),
                      ],
                    ),
                  ],
                ),
              ),

              // Checklist de Criterios Inspeccionados
              if (detalles.isNotEmpty)
                _buildCard(
                  title: 'Checklist de Inspección (${detalles.length} Criterios)',
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: detalles.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 6),
                    itemBuilder: (context, index) {
                      final d = detalles[index];
                      final cod = d['codigo']?.toString() ?? 'CV-${index + 1}';
                      final nom = d['nombre']?.toString() ?? 'Criterio';
                      final estadoDet = (d['estado'] ?? 'BIEN').toString().toUpperCase();

                      Color pillBg = const Color(0xFFE8F5E9);
                      Color pillTxt = const Color(0xFF2E7D32);
                      String label = 'BIEN';

                      if (estadoDet == 'MAL_ESTADO') {
                        pillBg = const Color(0xFFFFEBEE);
                        pillTxt = const Color(0xFFC62828);
                        label = 'M.E.';
                      } else if (estadoDet == 'NO_TIENE') {
                        pillBg = const Color(0xFFFFF3E0);
                        pillTxt = const Color(0xFFE65100);
                        label = 'N.T.';
                      }

                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAFAFA),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEEF2FF),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                cod,
                                style: const TextStyle(
                                  fontFamily: 'monospace',
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF4338CA),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                nom,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: pillBg,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                label,
                                style: TextStyle(color: pillTxt, fontWeight: FontWeight.w900, fontSize: 10),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

              // Observaciones
              if (observaciones.isNotEmpty)
                _buildCard(
                  title: 'Observaciones',
                  child: Text(
                    observaciones,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
