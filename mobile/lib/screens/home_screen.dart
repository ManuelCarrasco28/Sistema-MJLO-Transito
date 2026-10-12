import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';
import '../theme.dart';
import 'qr_scanner_screen.dart';
import 'register_vehicle_screen.dart';
import 'history_screen.dart';
import 'vehicle_details_screen.dart';
import 'person_details_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final int _selectedIndex = 0;
  int _registradasHoy = 0;
  int _reportesHoy = 0;
  Map<String, dynamic>? _operativoActivo;
  bool? _permitePapeletaMovil;
  Timer? _mobileConfigTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadDashboardData(); // Carga dashboard + permisos en un solo request
    _startMobileConfigAutoRefresh();
  }

  @override
  void dispose() {
    _mobileConfigTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void reassemble() {
    super.reassemble();
    _loadDashboardData();
    _startMobileConfigAutoRefresh();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadDashboardData();
      _startMobileConfigAutoRefresh();
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _mobileConfigTimer?.cancel();
      _mobileConfigTimer = null;
    }
  }

  void _startMobileConfigAutoRefresh() {
    _mobileConfigTimer?.cancel();
    _mobileConfigTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!mounted || _cargandoPanel) return;
      _loadDashboardData();
    });
  }

  bool _cargandoPanel = false;

  Future<void> _loadDashboardData() async {
    if (_cargandoPanel) return;
    _cargandoPanel = true;
    try {
      await _cargarPanel();
    } finally {
      _cargandoPanel = false;
    }
  }

  Future<void> _cargarPanel() async {
    // Un solo endpoint liviano en lugar de 3 peticiones pesadas.
    // Cada llamada se maneja por separado para que una falla en una
    // (p. ej. sin operativo asignado o wifi inestable) no bloquee
    // la actualización del permiso móvil ni de los contadores del día.
    try {
      final dashData = await ApiService.getMobileDashboard();
      if (mounted) {
        setState(() {
          _registradasHoy = dashData['papeletas_hoy'] as int? ?? 0;
          _reportesHoy = dashData['reportes_hoy'] as int? ?? 0;
          if (dashData.containsKey('permite_aplicar_papeleta')) {
            _permitePapeletaMovil =
                dashData['permite_aplicar_papeleta'] as bool? ?? false;
          }
        });
      }
    } catch (e) {
      // Ignorar errores silenciosamente para el dashboard
    }

    try {
      final op = await ApiService.getOperativoActivo();
      if (mounted) {
        setState(() {
          _operativoActivo = op;
        });
      }
    } catch (e) {
      // Ignorar errores silenciosamente para el operativo activo
    }
  }

  void _handlePrimaryControlAction() {
    _showSearchTypeSelectionDialog(context);
  }

  void _logout(BuildContext context) async {
    await ApiService.cerrarSesion();
    if (context.mounted) {
      Navigator.pushReplacementNamed(context, '/');
    }
  }

  void _showSearchTypeSelectionDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Tipo de Búsqueda',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryBlue,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('¿Qué dato tienes del infractor o vehículo?'),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      backgroundColor: AppTheme.primaryBlue,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: const Icon(Icons.pin),
                    label: const Text(
                      'Placa',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    onPressed: () {
                      Navigator.pop(context);
                      _showSearchDialog(context, 'PLACA');
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      backgroundColor: AppTheme.primaryBlue,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: const Icon(Icons.badge),
                    label: const Text(
                      'Documento',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    onPressed: () {
                      Navigator.pop(context);
                      _showSearchDialog(context, 'Documento');
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showSearchDialog(BuildContext context, String searchType) {
    final controller = TextEditingController();
    String title = searchType == 'PLACA' ? 'Buscar Placa' : 'Buscar Documento';
    String label = searchType == 'PLACA'
        ? 'Número de Placa'
        : 'Número de Documento';
    String hint = searchType == 'PLACA' ? '' : '';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryBlue,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (searchType != 'PLACA')
              const Padding(
                padding: EdgeInsets.only(bottom: 12.0),
                child: Text(
                  'Ingrese el número de DNI, Carnet de Extranjería o Pasaporte.',
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                ),
              ),
            TextField(
              controller: controller,
              maxLength: searchType == 'PLACA' ? 8 : 15,
              keyboardType: searchType == 'PLACA'
                  ? TextInputType.text
                  : TextInputType.number,
              inputFormatters: searchType == 'PLACA'
                  ? []
                  : [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                labelText: label,
                hintText: hint,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Colors.grey.shade50,
              ),
              textCapitalization: TextCapitalization.characters,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Cancelar',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryBlue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: () {
              final value = controller.text.trim().toUpperCase();
              if (value.isEmpty) return;
              Navigator.pop(context);
              if (searchType == 'PLACA') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => VehicleDetailsScreen(
                      searchQuery: value,
                      searchType: searchType,
                    ),
                  ),
                ).then((_) {
                  if (mounted) _loadDashboardData();
                });
              } else {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PersonDetailsScreen(dni: value),
                  ),
                ).then((_) {
                  if (mounted) _loadDashboardData();
                });
              }
            },
            child: const Text(
              'Buscar',
              style: TextStyle(fontWeight: FontWeight.bold),
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context),
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSummaryCards(),
                    const SizedBox(height: 24),
                    const Text(
                      'Acciones de Control',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.primaryBlue,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildActionGrid(context),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildBottomNavItem(Icons.home_rounded, 'Inicio', 0, () {}),
                _buildOperativoNavItem(),
                _buildBottomNavItem(
                  Icons.logout_rounded,
                  'Salir',
                  2,
                  () => _logout(context),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOperativoNavItem() {
    final bool hasOperativo = _operativoActivo != null;
    return InkWell(
      onTap: () {
        if (hasOperativo) {
          _showOperativoInfoDialog();
        } else {
          ScaffoldMessenger.of(context).clearSnackBars();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'No pertenece a ningún operativo activo en este momento.',
              ),
            ),
          );
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.shield,
              color: hasOperativo
                  ? AppTheme.accentYellow
                  : Colors.grey.shade500,
              size: 24,
            ),
            const SizedBox(height: 2),
            Text(
              'Operativo',
              style: TextStyle(
                fontSize: 12,
                color: hasOperativo
                    ? AppTheme.accentYellow
                    : Colors.grey.shade600,
                fontWeight: hasOperativo ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatHora12(dynamic timeVal) {
    if (timeVal == null) return '--:--';
    final str = timeVal.toString().trim();
    if (str.isEmpty || str == '-') return '--:--';
    final parts = str.split(':');
    if (parts.length >= 2) {
      final hour = int.tryParse(parts[0]);
      final minute = int.tryParse(parts[1]);
      if (hour != null && minute != null) {
        final period = hour >= 12 ? 'PM' : 'AM';
        final h12 = hour % 12 == 0 ? 12 : hour % 12;
        final hStr = h12.toString().padLeft(2, '0');
        final mStr = minute.toString().padLeft(2, '0');
        return '$hStr:$mStr $period';
      }
    }
    return str;
  }

  String _formatFecha(dynamic dateVal) {
    if (dateVal == null) return '-';
    final str = dateVal.toString().trim();
    if (str.isEmpty || str == '-') return '-';
    final parts = str.split('T')[0].split('-');
    if (parts.length == 3 && parts[0].length == 4) {
      return '${parts[2]}/${parts[1]}/${parts[0]}';
    }
    return str;
  }

  void _showOperativoInfoDialog() {
    final op = _operativoActivo!;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Operativo Actual',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryBlue,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDialogRow(Icons.local_police, 'Nombre', op['nombre'] ?? '-'),
            const SizedBox(height: 12),
            _buildDialogRow(Icons.location_on, 'Lugar', op['lugar'] ?? '-'),
            const SizedBox(height: 12),
            _buildDialogRow(
              Icons.event,
              'Fecha y Hora',
              '${_formatFecha(op['fecha'])}\nInicio: ${_formatHora12(op['hora_inicio'])} | Fin: ${_formatHora12(op['hora_fin'])}',
            ),
            const SizedBox(height: 12),
            _buildDialogRow(
              Icons.assignment_ind,
              'Su cargo',
              op['cargo_inspector'] ?? 'Inspector',
            ),
            const SizedBox(height: 12),
            _buildDialogRow(
              Icons.info_outline,
              'Estado',
              (op['estado'] ?? '-').toString().replaceAll('_', ' '),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'Cerrar',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDialogRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AppTheme.primaryBlue, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBottomNavItem(
    IconData icon,
    String label,
    int index,
    VoidCallback onTap,
  ) {
    final isSelected = _selectedIndex == index;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isSelected ? AppTheme.primaryBlue : Colors.grey.shade500,
              size: 24,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: isSelected ? AppTheme.primaryBlue : Colors.grey.shade600,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      color: AppTheme.primaryBlue,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: const BoxDecoration(
              color: AppTheme.accentYellow,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.person_outline,
              color: AppTheme.primaryBlue,
              size: 28,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FutureBuilder<SharedPreferences>(
              future: SharedPreferences.getInstance(),
              builder: (context, snapshot) {
                final prefs = snapshot.data;
                final nombre =
                    prefs?.getString('nombres')?.split(' ').first ??
                    'Inspector';
                final apellido =
                    prefs?.getString('apellidos')?.split(' ').first ?? '';

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Insp. $nombre $apellido',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _operativoActivo != null
                          ? 'Operativo: ${_operativoActivo!['nombre']}'
                          : 'Sin operativo asignado',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 12,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.white),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Registradas hoy',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '$_registradasHoy',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.primaryBlue,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'papeletas',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryBlue,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Registrados hoy',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '$_reportesHoy',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Colors.orange,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'reportes',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.orange,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionGrid(BuildContext context) {
    final bool configReady = _permitePapeletaMovil != null;
    final bool permitePapeleta = _permitePapeletaMovil == true;
    if (!configReady) {
      return const SizedBox(
        height: 220,
        child: Center(
          child: CircularProgressIndicator(color: AppTheme.primaryBlue),
        ),
      );
    }

    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 0.9,
      children: [
        _buildActionCard(
          title: 'Consultar Veh. / Persona',
          subtitle: permitePapeleta
              ? 'Buscar y generar\ninfracciones.'
              : 'Buscar y enviar\nreportes.',
          icon: permitePapeleta ? Icons.edit_document : Icons.camera_alt,
          isPrimary: true,
          onTap: () => _handlePrimaryControlAction(),
        ),
        _buildActionCard(
          title: 'Escáner',
          subtitle: 'Escaneo de código QR en\nDocumento o placas.',
          icon: Icons.qr_code_scanner,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const QrScannerScreen()),
            );
          },
        ),
        _buildActionCard(
          title: 'Registrar Veh./Pers. sin ident.',
          subtitle: permitePapeleta
              ? 'Registrar vehículo o persona sin placa/doc y generar infracción.'
              : 'Registrar vehículo o persona sin placa/doc y generar reporte.',
          icon: Icons.motorcycle,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const RegisterVehicleScreen()),
            );
          },
        ),
        _buildActionCard(
          title: 'Mi Historial',
          subtitle: 'Ver mis papeletas registradas.',
          icon: Icons.history,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const HistoryScreen()),
            ).then((_) {
              // Recargar conteos del dashboard al volver del historial
              if (mounted) _loadDashboardData();
            });
          },
        ),
      ],
    );
  }

  Widget _buildActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    bool isPrimary = false,
    String? badge,
    Color? badgeColor,
    Color? badgeTextColor,
    required VoidCallback onTap,
  }) {
    final bgColor = isPrimary ? AppTheme.primaryBlue : Colors.white;
    final textColor = isPrimary ? Colors.white : AppTheme.primaryBlue;
    final iconBgColor = isPrimary
        ? AppTheme.accentYellow
        : AppTheme.backgroundLight;
    final iconColor = AppTheme.primaryBlue;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(20),
          border: isPrimary ? null : Border.all(color: Colors.grey.shade200),
          boxShadow: [
            if (isPrimary)
              BoxShadow(
                color: AppTheme.primaryBlue.withOpacity(0.3),
                blurRadius: 10,
                offset: const Offset(0, 5),
              ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: iconBgColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: iconColor),
                ),
                if (badge != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: badgeColor ?? Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      badge,
                      style: TextStyle(
                        color: badgeTextColor ?? Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const Spacer(),
            Text(
              title,
              style: TextStyle(
                color: textColor,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: TextStyle(
                color: isPrimary ? Colors.white70 : Colors.grey.shade600,
                fontSize: 11,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
