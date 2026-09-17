import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'qr_scanner_screen.dart';
import 'register_vehicle_screen.dart';
import 'history_screen.dart';
import 'vehicle_details_screen.dart';
import 'person_history_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  int _selectedIndex = 0;
  int _registradasHoy = 0;
  bool? _permitePapeletaMovil;
  bool _isLoadingMobileConfig = true;
  int _mobileConfigRequestSeq = 0;
  Timer? _mobileConfigTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadDashboardData();
    _loadMobileConfig();
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
    _loadMobileConfig(silent: true);
    _startMobileConfigAutoRefresh();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadDashboardData();
      _loadMobileConfig(silent: true);
      _startMobileConfigAutoRefresh();
    } else if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      _mobileConfigTimer?.cancel();
      _mobileConfigTimer = null;
    }
  }

  void _startMobileConfigAutoRefresh() {
    _mobileConfigTimer?.cancel();
    _mobileConfigTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (!mounted) return;
      _loadMobileConfig(silent: true);
    });
  }

  Future<void> _loadDashboardData() async {
    try {
      final papeletas = await ApiService.getPapeletas();
      final todayStr = DateTime.now().toIso8601String().split('T').first;
      
      int count = 0;
      for (var p in papeletas) {
        final date = p['fechaHora']?.toString() ?? p['fecha_hora']?.toString() ?? p['created_at']?.toString() ?? '';
        if (date.startsWith(todayStr)) {
          count++;
        }
      }
      
      if (mounted) {
        setState(() {
          _registradasHoy = count;
        });
      }
    } catch (e) {
      // Ignorar errores silenciosamente para el dashboard
    }
  }

  Future<bool> _loadMobileConfig({bool silent = false}) async {
    final int requestId = ++_mobileConfigRequestSeq;
    if (!silent && mounted) {
      setState(() => _isLoadingMobileConfig = true);
    }

    bool permitido = false;
    try {
      permitido = await ApiService.permiteAplicarPapeletaMovil();
    } catch (_) {
      permitido = false;
    }

    if (mounted && requestId == _mobileConfigRequestSeq) {
      setState(() {
        _permitePapeletaMovil = permitido;
        _isLoadingMobileConfig = false;
      });
    }
    return permitido;
  }

  Future<void> _handlePrimaryControlAction() async {
    if (_isLoadingMobileConfig) return;

    setState(() => _isLoadingMobileConfig = true);
    final permitido = await _loadMobileConfig(silent: true);
    if (!mounted) return;

    if (permitido) {
      _showSearchTypeSelectionDialog(context);
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const RegisterVehicleScreen()),
      ).then((_) => _loadMobileConfig(silent: true));
    }
  }

  void _logout(BuildContext context) async {
    await ApiService.logout();
    if (context.mounted) {
      Navigator.pushReplacementNamed(context, '/');
    }
  }

  void _showSearchTypeSelectionDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Tipo de Búsqueda', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
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
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.pin),
                    label: const Text('Placa', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
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
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.badge),
                    label: const Text('DNI', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    onPressed: () {
                      Navigator.pop(context);
                      _showSearchDialog(context, 'DNI');
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
    String title = searchType == 'PLACA' ? 'Buscar Placa' : 'Buscar DNI';
    String label = searchType == 'PLACA' ? 'Número de Placa' : 'Número de Documento';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
        content: TextField(
          controller: controller,
          decoration: InputDecoration(
            labelText: label,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            filled: true,
            fillColor: Colors.grey.shade50,
          ),
          textCapitalization: TextCapitalization.characters,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryBlue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              final value = controller.text.trim().toUpperCase();
              if (value.isEmpty) return;
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => VehicleDetailsScreen(
                    searchQuery: value,
                    searchType: searchType,
                  ),
                ),
              );
            },
            child: const Text('Buscar', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showPersonHistoryDialog(BuildContext context) {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Consulta Historial', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
        contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Ingrese el DNI de la persona para buscar su historial de infracciones.', style: TextStyle(color: Colors.black87)),
            const SizedBox(height: 24),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Número de DNI',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.grey.shade50,
                prefixIcon: const Icon(Icons.badge, color: Colors.grey),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryBlue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              if (controller.text.trim().isEmpty) return;
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => PersonHistoryScreen(
                    dni: controller.text.trim(),
                    nombre: 'Consulta por DNI',
                  ),
                ),
              );
            },
            child: const Text('Consultar', style: TextStyle(fontWeight: FontWeight.bold)),
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
          child: SizedBox(
            height: 60,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildBottomNavItem(Icons.home_rounded, 'Inicio', 0),
                _buildBottomNavItem(Icons.history_rounded, 'Historial', 1),
                _buildBottomNavItem(Icons.logout_rounded, 'Salir', 2),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBottomNavItem(IconData icon, String label, int index) {
    final isSelected = _selectedIndex == index;
    return InkWell(
      onTap: () {
        if (index == 1) {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const HistoryScreen()),
          );
        } else if (index == 2) {
          _logout(context);
        } else {
          setState(() => _selectedIndex = index);
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
            child: const Icon(Icons.person_outline, color: AppTheme.primaryBlue, size: 28),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FutureBuilder<SharedPreferences>(
              future: SharedPreferences.getInstance(),
              builder: (context, snapshot) {
                final prefs = snapshot.data;
                final nombre = prefs?.getString('nombres')?.split(' ').first ?? 'Inspector';
                final apellido = prefs?.getString('apellidos')?.split(' ').first ?? '';
                
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
                  ],
                );
              },
            ),
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
                Text('Registradas hoy', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text('$_registradasHoy', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppTheme.primaryBlue)),
                    const SizedBox(width: 4),
                    Text('papeletas', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
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
    final bool configReady = _permitePapeletaMovil != null && !_isLoadingMobileConfig;
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
          title: permitePapeleta
              ? 'Nueva Papeleta'
              : 'Registrar Evidencia',
          subtitle: permitePapeleta
              ? 'Generar infracción\nvehicular en tiempo real.'
              : 'Enviar reporte para\nrevisión administrativa.',
          icon: permitePapeleta ? Icons.edit_document : Icons.camera_alt,
          isPrimary: true,
          badge: permitePapeleta ? 'NUEVO' : 'REPORTE',
          onTap: () => _handlePrimaryControlAction(),
        ),
        _buildActionCard(
          title: 'Escáner',
          subtitle: 'Escaneo de código QR en\nDNI o placas.',
          icon: Icons.qr_code_scanner,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const QrScannerScreen()),
            );
          },
        ),
        _buildActionCard(
          title: 'Registrar Informal',
          subtitle: 'Registrar vehículo sin\nplaca.',
          icon: Icons.motorcycle,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const RegisterVehicleScreen()),
            );
          },
        ),
        _buildActionCard(
          title: 'Consulta Historial',
          subtitle: 'Consultar papeletas por persona.',
          icon: Icons.person_search,
          onTap: () => _showPersonHistoryDialog(context),
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
    final iconBgColor = isPrimary ? AppTheme.accentYellow : AppTheme.backgroundLight;
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
              )
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
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
