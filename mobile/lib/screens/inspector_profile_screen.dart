import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../theme.dart';
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
            Text('Cerrar Sesión', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text('¿Está seguro de que desea salir y cerrar su sesión actual?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Cerrar Sesión', style: TextStyle(fontWeight: FontWeight.bold)),
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

  Widget _buildFieldItem({
    required IconData icon,
    required String label,
    required String value,
    String? badgeText,
    Color? badgeColor,
    bool allowCopy = false,
  }) {
    final valText = value.trim().isNotEmpty ? value.trim() : 'No registrado';
    final hasValue = value.trim().isNotEmpty;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryBlue.withOpacity(0.07),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: AppTheme.primaryBlue),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                    color: Colors.grey.shade500,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        valText,
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: hasValue ? const Color(0xFF1E293B) : Colors.grey.shade400,
                        ),
                      ),
                    ),
                    if (badgeText != null && badgeText.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: (badgeColor ?? AppTheme.primaryBlue).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: (badgeColor ?? AppTheme.primaryBlue).withOpacity(0.4)),
                        ),
                        child: Text(
                          badgeText,
                          style: TextStyle(
                            color: badgeColor ?? AppTheme.primaryBlue,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          if (allowCopy && hasValue)
            IconButton(
              icon: const Icon(Icons.copy_rounded, size: 17, color: Colors.grey),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              tooltip: 'Copiar',
              onPressed: () {
                Clipboard.setData(ClipboardData(text: valText));
                ScaffoldMessenger.of(context).clearSnackBars();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Row(
                      children: [
                        const Icon(Icons.check_circle_rounded, color: Colors.greenAccent, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text('$label copiado al portapapeles'),
                        ),
                      ],
                    ),
                    duration: const Duration(milliseconds: 1400),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData headerIcon,
    required List<Widget> children,
  }) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.025),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(headerIcon, size: 18, color: AppTheme.primaryBlue),
              const SizedBox(width: 8),
              Text(
                title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  color: AppTheme.primaryBlue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 8),
          ...children,
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
        : 'PERSONAL MUNICIPAL';
    final cargo = (_perfil['cargo'] ?? 'INSPECTOR MUNICIPAL').toString().toUpperCase();
    final uo = (_perfil['unidad_organica'] ?? 'Subgerencia de Tránsito, Transporte y Seguridad Vial').toString();
    final uoSiglas = (_perfil['uo_siglas'] ?? 'STTS').toString();
    final dni = (_perfil['dni'] ?? '').toString();
    final usuario = (_perfil['usuario'] ?? '').toString();
    final rol = (_perfil['rol'] ?? 'Inspector').toString();
    final tipoContrato = (_perfil['tipo_contrato'] ?? 'INTERNO').toString().toUpperCase();
    final email = (_perfil['email'] ?? '').toString();
    final celular = (_perfil['celular'] ?? '').toString();
    final direccion = (_perfil['direccion'] ?? '').toString();

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F9),
      appBar: AppBar(
        title: const Text(
          'Perfil del Usuario',
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
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryBlue))
            : SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: EdgeInsets.fromLTRB(16, 16, 16, 24 + bottomInset),
                child: Column(
                  children: [
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF0A2540), Color(0xFF1E3A8A)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF0A2540).withOpacity(0.3),
                            blurRadius: 14,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          Container(
                            width: 78,
                            height: 78,
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0xFFF5B041), width: 3),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.2),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
                          ),
                          const SizedBox(height: 14),

                          Text(
                            nombreCompleto,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 16.5,
                              letterSpacing: 0.3,
                            ),
                          ),
                          const SizedBox(height: 6),

                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withOpacity(0.22),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF10B981)),
                            ),
                            child: Text(
                              cargo,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Color(0xFF6EE7B7),
                                fontSize: 10.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),

                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF10B981),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                'Personal Activo y Autorizado',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    _buildSectionCard(
                      title: 'Datos Laborales e Institucionales',
                      headerIcon: Icons.business_rounded,
                      children: [
                        _buildFieldItem(
                          icon: Icons.account_balance_rounded,
                          label: 'Unidad Orgánica',
                          value: uo,
                          badgeText: uoSiglas.isNotEmpty ? uoSiglas : null,
                          badgeColor: const Color(0xFF1D4ED8),
                        ),
                        const Divider(height: 1),
                        _buildFieldItem(
                          icon: Icons.work_rounded,
                          label: 'Cargo Asignado',
                          value: cargo,
                        ),
                        const Divider(height: 1),
                        _buildFieldItem(
                          icon: Icons.admin_panel_settings_rounded,
                          label: 'Rol en el Sistema',
                          value: rol,
                        ),
                        const Divider(height: 1),
                        _buildFieldItem(
                          icon: Icons.assignment_ind_rounded,
                          label: 'Tipo de Contrato',
                          value: tipoContrato,
                          badgeText: tipoContrato,
                          badgeColor: const Color(0xFF059669),
                        ),
                        const Divider(height: 1),
                        _buildFieldItem(
                          icon: Icons.location_city_rounded,
                          label: 'Municipalidad',
                          value: 'Municipalidad Distrital de José Leonardo Ortiz',
                        ),
                      ],
                    ),

                    _buildSectionCard(
                      title: 'Identidad y Contacto',
                      headerIcon: Icons.badge_rounded,
                      children: [
                        _buildFieldItem(
                          icon: Icons.credit_card_rounded,
                          label: 'DNI / Documento de Identidad',
                          value: dni,
                          allowCopy: true,
                        ),
                        const Divider(height: 1),
                        _buildFieldItem(
                          icon: Icons.person_pin_rounded,
                          label: 'Usuario del Sistema',
                          value: usuario,
                          allowCopy: true,
                        ),
                        const Divider(height: 1),
                        _buildFieldItem(
                          icon: Icons.phone_android_rounded,
                          label: 'Celular de Contacto',
                          value: celular,
                          allowCopy: true,
                        ),
                        const Divider(height: 1),
                        _buildFieldItem(
                          icon: Icons.email_rounded,
                          label: 'Correo Electrónico',
                          value: email,
                          allowCopy: true,
                        ),
                        const Divider(height: 1),
                        _buildFieldItem(
                          icon: Icons.home_rounded,
                          label: 'Dirección Registrada',
                          value: direccion,
                        ),
                      ],
                    ),

                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(top: 8, bottom: 12),
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: _confirmarCerrarSesion,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFFDC2626),
                          elevation: 0,
                          side: BorderSide(color: Colors.red.shade200, width: 1.5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        icon: const Icon(Icons.logout_rounded, size: 20),
                        label: const Text(
                          'Cerrar Sesión',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5),
                        ),
                      ),
                    ),

                    Text(
                      'Sistema de Fiscalización y Tránsito • MDJLO v2.0',
                      style: TextStyle(
                        color: Colors.grey.shade500,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
