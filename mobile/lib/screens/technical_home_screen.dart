import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'select_formal_vehicle_screen.dart';
import 'technical_inspection_detail_screen.dart';
import 'technical_inspection_screen.dart';
import 'inspector_profile_screen.dart';
import 'login_screen.dart';

class TechnicalHomeScreen extends StatefulWidget {
  const TechnicalHomeScreen({super.key});

  @override
  State<TechnicalHomeScreen> createState() => _TechnicalHomeScreenState();
}

class _TechnicalHomeScreenState extends State<TechnicalHomeScreen> {
  String _inspectorNombre = '';
  String _cargo = 'INSPECTOR TÉCNICO VEHICULAR';
  bool _isLoading = true;
  List<Map<String, dynamic>> _inspecciones = [];
  final TextEditingController _buscarController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _cargarDatosUsuario();
    _cargarHistorial();
  }

  @override
  void dispose() {
    _buscarController.dispose();
    super.dispose();
  }

  Future<void> _cargarDatosUsuario() async {
    final prefs = await SharedPreferences.getInstance();
    final nombres = prefs.getString('nombres') ?? '';
    final apellidos = prefs.getString('apellidos') ?? '';
    final cargo = prefs.getString('cargo') ?? '';

    if (mounted) {
      setState(() {
        _inspectorNombre = '$nombres $apellidos'.trim();
        if (_inspectorNombre.isEmpty) _inspectorNombre = 'Inspector Técnico';
        if (cargo.isNotEmpty) _cargo = cargo.toUpperCase();
      });
    }
  }

  Future<void> _cargarHistorial({String? query}) async {
    setState(() => _isLoading = true);
    try {
      final list = await ApiService.getHistorialInspeccionesTecnicas(buscar: query);
      if (mounted) {
        setState(() {
          _inspecciones = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _cerrarSesion() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Cerrar Sesión', style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text('¿Estás seguro de que deseas salir de tu cuenta?'),
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

  Future<void> _abrirPerfil() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const InspectorProfileScreen(),
      ),
    );
    _cargarDatosUsuario();
    _cargarHistorial(query: _buscarController.text);
  }

  int get _totalHoy {
    final today = DateTime.now().toIso8601String().split('T')[0];
    return _inspecciones.where((i) {
      final f = i['fecha']?.toString() ?? '';
      return f.startsWith(today);
    }).length;
  }

  int get _aprobadasCount {
    return _inspecciones.where((i) => (i['resultado']?.toString() ?? '') == 'APROBADO').length;
  }

  Widget _buildPlacaBadge(String placa) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.black87, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 2.5, vertical: 0.5),
            decoration: BoxDecoration(
              color: const Color(0xFF0D47A1),
              borderRadius: BorderRadius.circular(2),
            ),
            child: const Text(
              'PE',
              style: TextStyle(color: Colors.white, fontSize: 7, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 5),
          Text(
            placa.toUpperCase(),
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: FontWeight.w900,
              letterSpacing: 1,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F9),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 16, 20),
              decoration: const BoxDecoration(
                color: AppTheme.primaryBlue,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(28),
                  bottomRight: Radius.circular(28),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: _abrirPerfil,
                          borderRadius: BorderRadius.circular(16),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4.0),
                            child: Row(
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  padding: const EdgeInsets.all(6),
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        _inspectorNombre.toUpperCase(),
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w900,
                                          fontSize: 12.5,
                                          height: 1.15,
                                        ),
                                        softWrap: true,
                                        maxLines: 2,
                                      ),
                                      const SizedBox(height: 3),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF10B981).withOpacity(0.25),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(color: const Color(0xFF10B981)),
                                        ),
                                        child: Text(
                                          _cargo,
                                          style: const TextStyle(
                                            color: Color(0xFF6EE7B7),
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 0.3,
                                            height: 1.15,
                                          ),
                                          softWrap: true,
                                          maxLines: 2,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.badge_outlined, color: Colors.white, size: 21),
                            onPressed: _abrirPerfil,
                            tooltip: 'Ver perfil del inspector',
                            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                            padding: const EdgeInsets.all(4),
                          ),
                          const SizedBox(width: 2),
                          IconButton(
                            icon: const Icon(Icons.refresh, color: Colors.white, size: 21),
                            onPressed: () => _cargarHistorial(query: _buscarController.text),
                            tooltip: 'Actualizar',
                            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                            padding: const EdgeInsets.all(4),
                          ),
                          const SizedBox(width: 2),
                          IconButton(
                            icon: const Icon(Icons.logout_rounded, color: Colors.white70, size: 21),
                            onPressed: _cerrarSesion,
                            tooltip: 'Cerrar sesión',
                            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                            padding: const EdgeInsets.all(4),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white.withOpacity(0.15)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Inspecciones hoy', style: TextStyle(color: Colors.white70, fontSize: 11)),
                              const SizedBox(height: 4),
                              Text(
                                '$_totalHoy',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white.withOpacity(0.15)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Aprobadas', style: TextStyle(color: Colors.white70, fontSize: 11)),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Text(
                                    '$_aprobadasCount',
                                    style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.w900, fontSize: 22),
                                  ),
                                  const SizedBox(width: 6),
                                  if (_aprobadasCount > 0)
                                    const Icon(Icons.verified_rounded, size: 16, color: Color(0xFF34D399)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: InkWell(
                onTap: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const SelectFormalVehicleScreen(),
                    ),
                  );
                  _cargarHistorial();
                },
                borderRadius: BorderRadius.circular(22),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0A2540), Color(0xFF1E3A8A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0A2540).withOpacity(0.25),
                        blurRadius: 12,
                        offset: const Offset(0, 5),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5B041),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Icons.fact_check_rounded, color: AppTheme.primaryBlue, size: 28),
                      ),
                      const SizedBox(width: 16),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Nueva Inspección CERTICAV',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 15,
                              ),
                            ),
                            SizedBox(height: 3),
                            Text(
                              'Elegir vehículo formal e inspeccionar',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 11.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white70, size: 16),
                    ],
                  ),
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'HISTORIAL DE INSPECCIONES',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF475569),
                      letterSpacing: 0.5,
                    ),
                  ),
                  Text(
                    '${_inspecciones.length} registros',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: TextField(
                controller: _buscarController,
                onChanged: (val) => _cargarHistorial(query: val),
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  hintText: 'Filtrar por placa o registro...',
                  hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                  prefixIcon: const Icon(Icons.search, size: 18, color: Colors.grey),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(vertical: 8),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: Colors.grey.shade200),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: Colors.grey.shade200),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 6),

            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryBlue))
                  : _inspecciones.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.inventory_2_outlined, size: 48, color: Colors.grey.shade300),
                              const SizedBox(height: 8),
                              const Text(
                                'No tienes inspecciones registradas',
                                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: EdgeInsets.fromLTRB(16, 6, 16, 24 + MediaQuery.of(context).padding.bottom),
                          itemCount: _inspecciones.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final insp = _inspecciones[index];
                            final placa = insp['vehiculoPlaca']?.toString() ?? '—';
                            final registro = insp['numeroRegistro']?.toString() ?? '—';
                            final fecha = insp['fecha']?.toString() ?? '';
                            final resultado = insp['resultado']?.toString() ?? 'APROBADO';
                            final estado = insp['estado']?.toString() ?? 'ACTIVO';
                            final transportador = insp['transportador']?.toString() ?? '—';
                            final int segTolerancia = int.tryParse(insp['segundosRestantesTolerancia']?.toString() ?? '') ?? 0;
                            final bool puedeEditar = estado != 'ANULADA' && segTolerancia > 0;

                            return InkWell(
                              onTap: () async {
                                final res = await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => TechnicalInspectionDetailScreen(inspeccion: insp),
                                  ),
                                );
                                if (res == true) {
                                  _cargarHistorial(query: _buscarController.text);
                                }
                              },
                              borderRadius: BorderRadius.circular(18),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: Colors.grey.shade200,
                                    width: 1,
                                  ),
                                  boxShadow: [
                                    BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2)),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        _buildPlacaBadge(placa),
                                        const SizedBox(width: 8),
                                        if (puedeEditar)
                                          InkWell(
                                            onTap: () async {
                                              final res = await Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (_) => TechnicalInspectionScreen(inspeccionAEditar: insp),
                                                ),
                                              );
                                              if (res == true) {
                                                _cargarHistorial(query: _buscarController.text);
                                              }
                                            },
                                            borderRadius: BorderRadius.circular(8),
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFFFF3E0),
                                                borderRadius: BorderRadius.circular(8),
                                                border: Border.all(color: const Color(0xFFFFB74D)),
                                              ),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  const Icon(Icons.edit_note_rounded, color: Color(0xFFE65100), size: 16),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    'Tolerancia ${(segTolerancia ~/ 60)}:${(segTolerancia % 60).toString().padLeft(2, '0')}',
                                                    style: const TextStyle(
                                                      color: Color(0xFFBF360C),
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),

                                    Row(
                                      children: [
                                        Icon(Icons.business, size: 14, color: Colors.grey.shade600),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            transportador,
                                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade800),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),

                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          'Reg: $registro · $fecha',
                                          style: TextStyle(fontFamily: 'monospace', fontSize: 11, color: Colors.grey.shade500),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: resultado == 'APROBADO' ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            resultado,
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: resultado == 'APROBADO' ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (puedeEditar) ...[
                                      const SizedBox(height: 6),
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFFF3E0),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(color: const Color(0xFFFFB74D)),
                                        ),
                                        child: Row(
                                          children: [
                                            const Icon(Icons.timer_outlined, size: 13, color: Color(0xFFE65100)),
                                            const SizedBox(width: 6),
                                            Expanded(
                                              child: Text(
                                                'Tolerancia activa: ${(segTolerancia ~/ 60)}:${(segTolerancia % 60).toString().padLeft(2, '0')} para modificar',
                                                style: const TextStyle(
                                                  color: Color(0xFFBF360C),
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
