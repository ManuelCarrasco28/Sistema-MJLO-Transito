import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme.dart';
import 'vehicle_details_screen.dart';
import 'history_screen.dart';
import 'register_vehicle_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

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
              if (controller.text.trim().isEmpty) return;
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => VehicleDetailsScreen(
                    searchQuery: controller.text.trim(),
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
                final id = prefs?.getInt('id_persona') ?? 0;
                
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
                    const Text('14', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppTheme.primaryBlue)),
                    const SizedBox(width: 4),
                    Text('papeletas', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 16),
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
                Text('Pendientes Sinc.', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Text('0', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.green)),
                    ),
                    const SizedBox(width: 8),
                    const Text('Sincronizado', style: TextStyle(fontSize: 13, color: Colors.green, fontWeight: FontWeight.bold)),
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
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 0.9,
      children: [
        _buildActionCard(
          title: 'Nueva Papeleta',
          subtitle: 'Generar infracción\nvehicular en tiempo real.',
          icon: Icons.edit_document,
          isPrimary: true,
          badge: 'NUEVO',
          onTap: () => _showSearchTypeSelectionDialog(context),
        ),
        _buildActionCard(
          title: 'Escáner',
          subtitle: 'Escaneo de código QR en\nDNI o placas.',
          icon: Icons.qr_code_scanner,
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Función de escáner en desarrollo')),
            );
          },
        ),
        _buildActionCard(
          title: 'Registrar Informal',
          subtitle: 'Registrar vehículo sin\nplaca o mototaxi.',
          icon: Icons.motorcycle,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const RegisterVehicleScreen()),
            );
          },
        ),
        _buildActionCard(
          title: 'Historial',
          subtitle: 'Revisar papeletas del\nturno e informes.',
          icon: Icons.history,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const HistoryScreen()),
            );
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
