import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../theme.dart';
import '../utils/animaciones.dart';
import 'login_screen.dart';

class InspectorProfileScreen extends StatefulWidget {
  const InspectorProfileScreen({super.key});

  @override
  State<InspectorProfileScreen> createState() => _InspectorProfileScreenState();
}

class _InspectorProfileScreenState extends State<InspectorProfileScreen> {
  bool _isLoading = true;
  Map<String, dynamic> _perfil = {};

  @override
  void initState() {
    super.initState();
    _cargarPerfil();
  }

  Future<void> _cargarPerfil() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiService.getPerfilInspector();
      if (mounted) {
        setState(() {
          _perfil = data;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _confirmarCerrarSesion() async {
    final bool? confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: Colors.red),
            SizedBox(width: 10),
            Text(
              'Cerrar Sesión',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: const Text(
          '¿Está seguro de que desea salir y cerrar su sesión actual?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text(
              'Cancelar',
              style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text(
              'Cerrar Sesión',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (confirmar == true && mounted) {
      await ApiService.cerrarSesion();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    }
  }

  static const Color _tinta = Color(0xFF1E293B);
  static const Color _linea = Color(0xFFE2E8F0);

  /// Dato del perfil: etiqueta pequeña arriba, valor debajo y, si aplica, botón para copiar.
  Widget _buildFieldItem({
    required String label,
    required String value,
    bool allowCopy = false,
  }) {
    final valText = value.trim().isNotEmpty ? value.trim() : 'No registrado';
    final hasValue = value.trim().isNotEmpty;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  valText,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.3,
                    fontWeight: hasValue ? FontWeight.w600 : FontWeight.w400,
                    color: hasValue ? _tinta : Colors.grey.shade400,
                  ),
                ),
              ],
            ),
          ),
          if (allowCopy && hasValue)
            IconButton(
              icon: Icon(
                Icons.copy_rounded,
                size: 18,
                color: Colors.grey.shade500,
              ),
              visualDensity: VisualDensity.compact,
              tooltip: 'Copiar',
              onPressed: () {
                Clipboard.setData(ClipboardData(text: valText));
                ScaffoldMessenger.of(context).clearSnackBars();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('$label copiado'),
                    duration: const Duration(milliseconds: 1400),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  /// Grupo de datos: título con marca amarilla y filas separadas por una línea fina, sin tarjeta.
  Widget _buildSection({
    required String title,
    required List<Widget> children,
  }) {
    final filas = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      if (i > 0) filas.add(const Divider(height: 1, color: _linea));
      filas.add(children[i]);
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 16,
                decoration: BoxDecoration(
                  color: AppTheme.accentYellow,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.primaryBlue,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Divider(height: 1, color: _linea),
          ...filas,
        ],
      ),
    );
  }

  /// Cabecera plana, continua con la barra superior: logo, nombre, cargo y estado.
  Widget _buildCabecera({required String nombre, required String cargo}) {
    return Container(
      width: double.infinity,
      color: AppTheme.primaryBlue,
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 72,
            height: 72,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: AppTheme.primaryBlue,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.accentYellow, width: 2.5),
            ),
            child: Image.asset('assets/images/app_icon.png', fit: BoxFit.contain),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  nombre,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 17,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  cargo,
                  style: const TextStyle(
                    color: AppTheme.accentYellow,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    letterSpacing: 0.6,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFF34D399),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        'Personal activo',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.75),
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
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
    final bottomInset = MediaQuery.of(context).padding.bottom;

    final nombres = (_perfil['nombres'] ?? '').toString().trim();
    final apellidos = (_perfil['apellidos'] ?? '').toString().trim();
    final nombreCompleto = (nombres.isNotEmpty || apellidos.isNotEmpty)
        ? '$nombres $apellidos'.trim().toUpperCase()
        : 'INSPECTOR MUNICIPAL';
    final cargo = (_perfil['cargo'] ?? 'INSPECTOR TÉCNICO VEHICULAR')
        .toString()
        .toUpperCase();
    final uo =
        (_perfil['unidad_organica'] ??
                'Subgerencia de Tránsito, Transporte y Seguridad Vial')
            .toString();
    final uoSiglas = (_perfil['uo_siglas'] ?? 'STTS').toString();
    final dni = (_perfil['dni'] ?? '').toString();
    final usuario = (_perfil['usuario'] ?? '').toString();
    final rol = (_perfil['rol'] ?? 'Inspector Técnico').toString();
    final tipoContrato = (_perfil['tipo_contrato'] ?? 'INTERNO')
        .toString()
        .toUpperCase();
    final email = (_perfil['email'] ?? '').toString();
    final celular = (_perfil['celular'] ?? '').toString();
    final direccion = (_perfil['direccion'] ?? '').toString();

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: const Text(
          'Perfil del Inspector',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: AppTheme.primaryBlue,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Actualizar perfil',
            onPressed: _cargarPerfil,
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: AppTheme.primaryBlue),
              )
            : SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AparicionEscalonada(
                      desplazamiento: 8,
                      child: _buildCabecera(
                        nombre: nombreCompleto,
                        cargo: cargo,
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        20,
                        24,
                        20,
                        16 + bottomInset,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          AparicionEscalonada(
                            indice: 1,
                            child: _buildSection(
                              title: 'Datos laborales',
                              children: [
                                _buildFieldItem(
                                  label: 'Unidad orgánica',
                                  value: uoSiglas.isNotEmpty
                                      ? '$uo ($uoSiglas)'
                                      : uo,
                                ),
                                _buildFieldItem(
                                  label: 'Rol en el sistema',
                                  value: rol,
                                ),
                                _buildFieldItem(
                                  label: 'Tipo de contrato',
                                  value: tipoContrato,
                                ),
                                _buildFieldItem(
                                  label: 'Municipalidad',
                                  value: 'Municipalidad Distrital de José Leonardo Ortiz',
                                ),
                              ],
                            ),
                          ),
                          AparicionEscalonada(
                            indice: 2,
                            child: _buildSection(
                              title: 'Identidad y contacto',
                              children: [
                                _buildFieldItem(
                                  label: 'DNI',
                                  value: dni,
                                  allowCopy: true,
                                ),
                                _buildFieldItem(
                                  label: 'Usuario del sistema',
                                  value: usuario,
                                  allowCopy: true,
                                ),
                                _buildFieldItem(
                                  label: 'Celular',
                                  value: celular,
                                  allowCopy: true,
                                ),
                                _buildFieldItem(
                                  label: 'Correo electrónico',
                                  value: email,
                                  allowCopy: true,
                                ),
                                _buildFieldItem(
                                  label: 'Dirección',
                                  value: direccion,
                                ),
                              ],
                            ),
                          ),
                          AparicionEscalonada(
                            indice: 3,
                            child: SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: _confirmarCerrarSesion,
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFFDC2626),
                                  side: BorderSide(color: Colors.red.shade200),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 14,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                icon: const Icon(
                                  Icons.logout_rounded,
                                  size: 20,
                                ),
                                label: const Text(
                                  'Cerrar sesión',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          Center(
                            child: Text(
                              'App Tránsito JLO • MDJLO v2.0',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.grey.shade500,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
