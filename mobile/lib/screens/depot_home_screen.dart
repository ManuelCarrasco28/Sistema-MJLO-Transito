import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'depot_inventory_screen.dart';
import 'inspector_profile_screen.dart';
import 'login_screen.dart';
import 'pdf_viewer_screen.dart';

class DepotHomeScreen extends StatefulWidget {
  const DepotHomeScreen({super.key});

  @override
  State<DepotHomeScreen> createState() => _DepotHomeScreenState();
}

class _DepotHomeScreenState extends State<DepotHomeScreen> {
  String _encargadoNombre = 'Encargado de Depósito';
  String _cargo = 'ADMINISTRADOR DE DEPÓSITO MUNICIPAL';
  bool _isLoading = true;

  Map<String, dynamic> _estadisticas = {
    'total': 0,
    'enDeposito': 0,
    'liberados': 0,
    'avgDias': 0,
  };

  List<Map<String, dynamic>> _internamientos = [];
  String _filtroEstado = 'TODOS';
  final TextEditingController _buscarCtrl = TextEditingController();
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _cargarDatosUsuario();
    _cargarDatos();
  }

  @override
  void dispose() {
    _buscarCtrl.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  Future<void> _cargarDatosUsuario() async {
    final prefs = await SharedPreferences.getInstance();
    final nombres = prefs.getString('nombres') ?? '';
    final apellidos = prefs.getString('apellidos') ?? '';
    final cargo = prefs.getString('cargo') ?? '';

    if (mounted) {
      setState(() {
        final completo = '$nombres $apellidos'.trim();
        if (completo.isNotEmpty) _encargadoNombre = completo;
        if (cargo.isNotEmpty) _cargo = cargo.toUpperCase();
      });
    }
  }

  Future<void> _cargarDatos() async {
    setState(() => _isLoading = true);
    await Future.wait([
      _cargarEstadisticas(),
      _cargarInternamientos(),
    ]);
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _cargarEstadisticas() async {
    try {
      final stats = await ApiService.getInternamientoEstadisticas();
      if (mounted) {
        setState(() {
          _estadisticas = stats;
        });
      }
    } catch (_) {}
  }

  Future<void> _cargarInternamientos() async {
    try {
      final res = await ApiService.getInternamientos(
        buscar: _buscarCtrl.text.trim(),
        estado: _filtroEstado,
      );
      if (mounted) {
        setState(() {
          _internamientos = List<Map<String, dynamic>>.from(res['data'] ?? []);
        });
      }
    } catch (_) {}
  }

  void _onSearchChanged(String val) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      _cargarInternamientos();
    });
  }

  Future<void> _abrirPerfil() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const InspectorProfileScreen()),
    );
    _cargarDatosUsuario();
    _cargarDatos();
  }

  void _cerrarSesion() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Cerrar Sesión', style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text('¿Está seguro de que desea salir del módulo de depósito?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Salir'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await ApiService.cerrarSesion();
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (_) => false,
        );
      }
    }
  }

  void _verBoletaPdf(Map<String, dynamic> item) {
    final boleta = (item['numeroBoleta'] ?? item['id'] ?? '').toString();
    final url = ApiService.getBoletaPdfUrl(item['uuid'] ?? item['id']);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PdfViewerScreen(
          title: 'Boleta de Internamiento',
          subtitle: 'Boleta Nº $boleta',
          pdfUrl: url,
        ),
      ),
    );
  }

  void _verLibertadPdf(Map<String, dynamic> item) {
    final orden = (item['numeroOrdenLibertad'] ?? item['id'] ?? '').toString();
    final url = ApiService.getLibertadPdfUrl(item['uuid'] ?? item['id']);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PdfViewerScreen(
          title: 'Orden de Libertad',
          subtitle: 'Orden Nº $orden',
          pdfUrl: url,
        ),
      ),
    );
  }

  void _abrirInventario(Map<String, dynamic> item) async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => DepotInventoryScreen(internamiento: item),
      ),
    );

    if (result == true) {
      _cargarDatos();
    }
  }

  String _formatearFechaHora(dynamic fechaRaw) {
    if (fechaRaw == null || fechaRaw.toString().trim().isEmpty) return '-';
    final str = fechaRaw.toString().trim();
    try {
      DateTime dt;
      if (str.contains('T')) {
        dt = DateTime.parse(str).toLocal();
      } else if (str.contains(' ')) {
        final partes = str.split(' ');
        final f = partes[0].split('-');
        final h = partes[1].split(':');
        final anio = int.parse(f[0]);
        final mes = int.parse(f[1]);
        final dia = int.parse(f[2]);
        final hora = int.parse(h[0]);
        final minuto = h.length > 1 ? int.parse(h[1]) : 0;
        final segundo = h.length > 2 ? int.parse(h[2].split('.')[0]) : 0;
        dt = DateTime(anio, mes, dia, hora, minuto, segundo);
      } else if (str.contains('-')) {
        final f = str.split('-');
        final anio = int.parse(f[0]);
        final mes = int.parse(f[1]);
        final dia = int.parse(f[2]);
        return '${dia.toString().padLeft(2, '0')}/${mes.toString().padLeft(2, '0')}/$anio';
      } else {
        dt = DateTime.parse(str);
      }

      final dia = dt.day.toString().padLeft(2, '0');
      final mes = dt.month.toString().padLeft(2, '0');
      final anio = dt.year.toString();

      final hora24 = dt.hour;
      final minuto = dt.minute.toString().padLeft(2, '0');
      final amPm = hora24 >= 12 ? 'p. m.' : 'a. m.';
      final hora12 = hora24 == 0 ? 12 : (hora24 > 12 ? hora24 - 12 : hora24);
      final horaStr = hora12.toString().padLeft(2, '0');

      return '$dia/$mes/$anio $horaStr:$minuto $amPm';
    } catch (_) {
      return str;
    }
  }

  String _formatearFechaCorta(dynamic fechaRaw) {
    if (fechaRaw == null || fechaRaw.toString().trim().isEmpty) return '-';
    final str = fechaRaw.toString().trim();
    try {
      if (str.contains('-')) {
        final parteFecha = str.split(' ')[0].split('T')[0];
        final f = parteFecha.split('-');
        if (f.length == 3) {
          final anio = f[0];
          final mes = f[1].padLeft(2, '0');
          final dia = f[2].padLeft(2, '0');
          return '$dia/$mes/$anio';
        }
      }
      final dt = DateTime.parse(str);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return str;
    }
  }

  void _mostrarDetalles(Map<String, dynamic> item) {
    final boleta = item['numeroBoleta'] ?? '';
    final placa = item['vehiculoPlaca'] ?? '';
    final estado = (item['estado'] ?? 'RETENIDO').toString().toUpperCase().trim();
    final esLiberado = estado == 'LIBERADO';
    final esEnProceso = estado == 'EN_PROCESO';
    final esRetenido = estado == 'RETENIDO';

    Color badgeBg;
    Color badgeText;
    String badgeLabel;

    if (esLiberado) {
      badgeBg = Colors.green.shade100;
      badgeText = Colors.green.shade900;
      badgeLabel = 'LIBERADO';
    } else if (esEnProceso) {
      badgeBg = const Color(0xFFE0F2FE);
      badgeText = const Color(0xFF0369A1);
      badgeLabel = 'EN PROCESO';
    } else {
      badgeBg = Colors.amber.shade100;
      badgeText = Colors.amber.shade900;
      badgeLabel = 'EN DEPÓSITO';
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(ctx).size.height * 0.85,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'Detalles $boleta',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: badgeBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        badgeLabel,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: badgeText,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow('Placa:', placa),
                      _buildDetailRow('Vehículo:', '${item['vehiculoTipo'] ?? ''} ${item['vehiculoMarca'] ?? ''} ${item['vehiculoModelo'] ?? ''}'.trim()),
                      _buildDetailRow('Color:', item['vehiculoColor'] ?? 'No especificado'),
                      _buildDetailRow('Serie Motor:', item['vehiculoMotor'] ?? 'No registrado'),
                      _buildDetailRow(
                        'Documento Origen:',
                        (item['numeroPapeleta'] != null && item['numeroPapeleta'].toString().trim().isNotEmpty)
                            ? (item['numeroPapeleta'].toString().startsWith('REP')
                                ? item['numeroPapeleta'].toString()
                                : 'Papeleta N° ${item['numeroPapeleta']}')
                            : 'Sin documento',
                      ),
                      _buildDetailRow('Infracción:', item['infraccionCodigo'] ?? 'Sin infracción'),
                      _buildDetailRow('Conductor:', item['conductorNombre'] ?? 'No identificado'),
                      _buildDetailRow('DNI Conductor:', item['conductorDni'] ?? 'S/D'),
                      _buildDetailRow('Interesado:', item['interesadoNombre'] ?? 'No registrado'),
                      _buildDetailRow('DNI Interesado:', item['interesadoDni'] ?? 'S/D'),
                      _buildDetailRow('Fecha Ingreso:', _formatearFechaHora(item['fechaIngreso'])),
                      if (!esRetenido && item['fechaSalida'] != null)
                        _buildDetailRow('Fecha Salida:', _formatearFechaHora(item['fechaSalida'])),
                      _buildDetailRow('Días en custodia:', '${item['totalDias'] ?? 1} días'),
                      _buildDetailRow('Inspector Remisor:', item['remisorNombre'] ?? 'No identificado'),
                      _buildDetailRow('Depósito:', item['deposito'] ?? 'Depósito Oficial José L. Ortiz'),
                      if (item['numeroOrdenLibertad'] != null && item['numeroOrdenLibertad'].toString().trim().isNotEmpty)
                        _buildDetailRow('N° Orden Libertad:', item['numeroOrdenLibertad'].toString()),
                      if (item['observaciones'] != null && item['observaciones'].toString().trim().isNotEmpty) ...[
                        const SizedBox(height: 8),
                        const Text('Observaciones:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 4),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            item['observaciones'],
                            style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 14),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _abrirInventario(item);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryBlue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(Icons.edit_note, size: 22),
                          SizedBox(width: 8),
                          Text(
                            'Ver / Modificar Inventario',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 125,
            child: Text(label, style: TextStyle(fontSize: 12.5, color: Colors.grey.shade600)),
          ),
          Expanded(
            child: Text(
              value.isNotEmpty ? value : '-',
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 20, color: iconColor),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade600,
                      letterSpacing: 0.3,
                    ),
                    maxLines: 1,
                  ),
                ),
                const SizedBox(height: 2),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    value,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Colors.black87,
                    ),
                    maxLines: 1,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInternamientoCard(Map<String, dynamic> item) {
    final boleta = (item['numeroBoleta'] ?? '').toString();
    final placa = (item['vehiculoPlaca'] ?? '').toString();
    final infraccion = (item['infraccionCodigo'] ?? '').toString();
    final conductor = (item['conductorNombre'] ?? 'Conductor no identificado').toString();
    final conductorDni = (item['conductorDni'] ?? 'S/D').toString();
    final dias = (item['totalDias'] ?? 1).toString();
    final estado = (item['estado'] ?? 'RETENIDO').toString().toUpperCase().trim();
    final esLiberado = estado == 'LIBERADO';
    final esEnProceso = estado == 'EN_PROCESO';

    Color cardBadgeBg;
    Color cardBadgeBorder;
    Color cardBadgeDot;
    Color cardBadgeText;
    String cardBadgeLabel;

    if (esLiberado) {
      cardBadgeBg = const Color(0xFFD1FAE5);
      cardBadgeBorder = const Color(0xFF10B981);
      cardBadgeDot = const Color(0xFF059669);
      cardBadgeText = const Color(0xFF065F46);
      cardBadgeLabel = 'LIBERADO';
    } else if (esEnProceso) {
      cardBadgeBg = const Color(0xFFE0F2FE);
      cardBadgeBorder = const Color(0xFF38BDF8);
      cardBadgeDot = const Color(0xFF0284C7);
      cardBadgeText = const Color(0xFF0369A1);
      cardBadgeLabel = 'EN PROCESO';
    } else {
      cardBadgeBg = const Color(0xFFFEF3C7);
      cardBadgeBorder = const Color(0xFFF59E0B);
      cardBadgeDot = const Color(0xFFD97706);
      cardBadgeText = const Color(0xFFB45309);
      cardBadgeLabel = 'RETENIDO';
    }

    final String fechaDisplay = _formatearFechaCorta(item['fechaIngreso']);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          // Cabecera de la tarjeta: Boleta, Estado y Botón Detalles
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.receipt_long, size: 18, color: AppTheme.primaryBlue),
                    const SizedBox(width: 6),
                    Text(
                      boleta,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ],
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: cardBadgeBg,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: cardBadgeBorder,
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: cardBadgeDot,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            cardBadgeLabel,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: cardBadgeText,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => _mostrarDetalles(item),
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          child: Icon(
                            Icons.visibility_outlined,
                            size: 16,
                            color: Colors.grey.shade700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Cuerpo de la tarjeta: Placa, Infracción, Conductor, Custodia
          InkWell(
            onTap: () => _mostrarDetalles(item),
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Placa peruana
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade300,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: Colors.black87, width: 2),
                        ),
                        child: Text(
                          placa.isNotEmpty ? placa : 'S/P',
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                            letterSpacing: 1.2,
                            color: Colors.black87,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (infraccion.isNotEmpty)
                              Container(
                                margin: const EdgeInsets.only(bottom: 4),
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.red.shade50,
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: Colors.red.shade200),
                                ),
                                child: Text(
                                  infraccion,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                    color: Colors.red.shade700,
                                  ),
                                ),
                              ),
                            Text(
                              conductor,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              'DNI: $conductorDni',
                              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey),
                            const SizedBox(width: 6),
                            Text(
                              fechaDisplay,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            Icon(Icons.schedule, size: 14, color: Colors.amber.shade800),
                            const SizedBox(width: 6),
                            Text(
                              '$dias días en custodia',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.amber.shade900,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),

          if (esEnProceso)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F9FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBAE6FD)),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.local_shipping_outlined, size: 14, color: Color(0xFF0284C7)),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'En camino al depósito • Pendiente de inventario',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF0369A1),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Botones de acción responsive
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Row(
              children: [
                // Ver PDF de boleta
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _verBoletaPdf(item),
                    style: OutlinedButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 9),
                      foregroundColor: AppTheme.primaryBlue,
                      side: BorderSide(color: Colors.blue.shade200, width: 1.2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(Icons.description_outlined, size: 15),
                          SizedBox(width: 4),
                          Text('Boleta', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ),

                // Ver PDF de orden de libertad si está liberado
                if (esLiberado) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _verLibertadPdf(item),
                      style: OutlinedButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 9),
                        foregroundColor: const Color(0xFF059669),
                        side: const BorderSide(color: Color(0xFF10B981), width: 1.2),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.assignment_turned_in_outlined, size: 15),
                            SizedBox(width: 4),
                            Text('Libertad', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],

                const SizedBox(width: 8),

                // Inventario / Editar
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _abrirInventario(item),
                    style: ElevatedButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 9),
                      backgroundColor: esEnProceso ? const Color(0xFF0284C7) : AppTheme.primaryBlue,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(esEnProceso ? Icons.playlist_add_check_rounded : Icons.edit_note, size: 16),
                          const SizedBox(width: 4),
                          Text(esEnProceso ? 'Inventariar' : 'Inventario', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: SafeArea(
        child: Column(
          children: [
            // Cabecera superior moderna
            Container(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              decoration: const BoxDecoration(
                color: AppTheme.primaryBlue,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      // Avatar que abre perfil
                      InkWell(
                        onTap: _abrirPerfil,
                        borderRadius: BorderRadius.circular(24),
                        child: CircleAvatar(
                          radius: 22,
                          backgroundColor: Colors.white.withOpacity(0.2),
                          child: const Icon(Icons.security, color: Colors.white, size: 24),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: InkWell(
                          onTap: _abrirPerfil,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _encargadoNombre.toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _cargo,
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.85),
                                  fontSize: 11,
                                  letterSpacing: 0.4,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: _abrirPerfil,
                        icon: const Icon(Icons.badge_outlined, color: Colors.white),
                        tooltip: 'Ver mi perfil',
                      ),
                      IconButton(
                        onPressed: _cargarDatos,
                        icon: const Icon(Icons.refresh, color: Colors.white),
                        tooltip: 'Actualizar',
                      ),
                      IconButton(
                        onPressed: _cerrarSesion,
                        icon: const Icon(Icons.logout, color: Colors.white70),
                        tooltip: 'Cerrar sesión',
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Barra de búsqueda
                  TextField(
                    controller: _buscarCtrl,
                    onChanged: _onSearchChanged,
                    style: const TextStyle(color: Colors.black87, fontSize: 13),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Colors.white,
                      prefixIcon: const Icon(Icons.search, color: Colors.grey),
                      hintText: 'Buscar por placa, boleta o conductor...',
                      hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      isDense: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Tarjetas KPI Estadísticas adaptativas
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final isWide = constraints.maxWidth > 550;
                  final kpiTotal = _buildKpiCard(
                    title: 'TOTAL',
                    value: '${_estadisticas['total'] ?? 0}',
                    icon: Icons.directions_car,
                    iconColor: Colors.blue,
                    bgColor: Colors.blue.shade50,
                  );
                  final kpiEnProceso = _buildKpiCard(
                    title: 'EN PROCESO',
                    value: '${_estadisticas['enProceso'] ?? 0}',
                    icon: Icons.local_shipping_outlined,
                    iconColor: const Color(0xFF0284C7),
                    bgColor: const Color(0xFFE0F2FE),
                  );
                  final kpiEnDeposito = _buildKpiCard(
                    title: 'EN DEPÓSITO',
                    value: '${_estadisticas['enDeposito'] ?? 0}',
                    icon: Icons.lock_clock,
                    iconColor: Colors.amber.shade800,
                    bgColor: Colors.amber.shade50,
                  );
                  final kpiLiberados = _buildKpiCard(
                    title: 'LIBERADOS',
                    value: '${_estadisticas['liberados'] ?? 0}',
                    icon: Icons.check_circle_outline,
                    iconColor: Colors.green,
                    bgColor: Colors.green.shade50,
                  );
                  if (isWide) {
                    return Row(
                      children: [
                        Expanded(child: kpiTotal),
                        const SizedBox(width: 8),
                        Expanded(child: kpiEnProceso),
                        const SizedBox(width: 8),
                        Expanded(child: kpiEnDeposito),
                        const SizedBox(width: 8),
                        Expanded(child: kpiLiberados),
                      ],
                    );
                  }

                  return Column(
                    children: [
                      Row(
                        children: [
                          Expanded(child: kpiTotal),
                          const SizedBox(width: 8),
                          Expanded(child: kpiEnProceso),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(child: kpiEnDeposito),
                          const SizedBox(width: 8),
                          Expanded(child: kpiLiberados),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),

            // Filtro por Estado (Todos, En Proceso, En Depósito, Liberados)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  _buildFilterChip('TODOS', 'Todos (${_estadisticas['total'] ?? 0})'),
                  const SizedBox(width: 8),
                  _buildFilterChip('EN_PROCESO', 'En Proceso (${_estadisticas['enProceso'] ?? 0})'),
                  const SizedBox(width: 8),
                  _buildFilterChip('RETENIDO', 'En Depósito (${_estadisticas['enDeposito'] ?? 0})'),
                  const SizedBox(width: 8),
                  _buildFilterChip('LIBERADO', 'Liberados (${_estadisticas['liberados'] ?? 0})'),
                ],
              ),
            ),

            // Lista de internamientos
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _cargarDatos,
                      child: _internamientos.isEmpty
                          ? Center(
                              child: SingleChildScrollView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.directions_car_filled_outlined, size: 64, color: Colors.grey.shade400),
                                    const SizedBox(height: 12),
                                    Text(
                                      'No se encontraron internamientos vehiculares',
                                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade600),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Usa el botón "+ Nuevo" para ingresar un vehículo.',
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          : ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                              padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + MediaQuery.of(context).padding.bottom),
                              itemCount: _internamientos.length,
                              itemBuilder: (context, idx) => _buildInternamientoCard(_internamientos[idx]),
                            ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String valor, String label) {
    final isSelected = _filtroEstado == valor;
    return InkWell(
      onTap: () {
        setState(() {
          _filtroEstado = valor;
        });
        _cargarInternamientos();
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryBlue : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppTheme.primaryBlue : Colors.grey.shade300,
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : Colors.grey.shade700,
          ),
        ),
      ),
    );
  }
}
