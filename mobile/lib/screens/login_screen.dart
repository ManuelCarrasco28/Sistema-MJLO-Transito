import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usuarioController = TextEditingController();
  final _passwordController = TextEditingController();
  final _passwordFocusNode = FocusNode();
  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _recordarUsuario = false;
  List<String> _historialUsuarios = [];

  @override
  void initState() {
    super.initState();
    _cargarConfiguracionUsuario();
  }

  Future<void> _cargarConfiguracionUsuario() async {
    try {
      final config = await ApiService.obtenerConfiguracionLogin();
      if (mounted) {
        setState(() {
          _recordarUsuario = config['recordar'] as bool;
          final guardado = config['usuario'] as String?;
          if (_recordarUsuario && guardado != null && guardado.isNotEmpty) {
            _usuarioController.text = guardado;
          }
          _historialUsuarios = List<String>.from(config['historial'] ?? []);
        });
      }
    } catch (_) {}
  }

  void _seleccionarUsuario(String user) {
    setState(() {
      _usuarioController.text = user;
    });
    _passwordFocusNode.requestFocus();
  }

  Future<void> _eliminarDeHistorial(String user) async {
    await ApiService.eliminarUsuarioDeHistorial(user);
    if (mounted) {
      setState(() {
        _historialUsuarios.remove(user);
        if (_usuarioController.text.trim().toLowerCase() == user.toLowerCase() && !_recordarUsuario) {
          _usuarioController.clear();
        }
      });
    }
  }

  void _mostrarModalHistorial() {
    if (_historialUsuarios.isEmpty) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryBlue.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.history_rounded,
                            color: AppTheme.primaryBlue,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Cuentas Recientes',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryBlue,
                              ),
                            ),
                            Text(
                              'Usuarios validados previamente en este dispositivo',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ConstrainedBox(
                      constraints: BoxConstraints(
                        maxHeight: MediaQuery.of(context).size.height * 0.4,
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: _historialUsuarios.length,
                        separatorBuilder: (ctx, idx) => Divider(
                          color: Colors.grey.shade200,
                          height: 1,
                        ),
                        itemBuilder: (context, index) {
                          final user = _historialUsuarios[index];
                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            leading: CircleAvatar(
                              backgroundColor: AppTheme.accentYellow.withOpacity(0.3),
                              foregroundColor: AppTheme.primaryBlue,
                              child: const Icon(Icons.person_rounded, size: 20),
                            ),
                            title: Text(
                              user,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                            subtitle: const Text(
                              'Inspector Municipal',
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                            trailing: IconButton(
                              icon: const Icon(
                                Icons.close_rounded,
                                size: 18,
                                color: Colors.grey,
                              ),
                              tooltip: 'Eliminar del historial',
                              onPressed: () async {
                                await _eliminarDeHistorial(user);
                                setModalState(() {});
                                if (_historialUsuarios.isEmpty && context.mounted) {
                                  Navigator.pop(context);
                                }
                              },
                            ),
                            onTap: () {
                              Navigator.pop(context);
                              _seleccionarUsuario(user);
                            },
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _signIn() async {
    ScaffoldMessenger.of(context).clearSnackBars();
    final usuario = _usuarioController.text.trim();
    final password = _passwordController.text;

    if (usuario.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor llena todos los campos')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      await ApiService.login(usuario, password);

      // SOLO guardamos en historial y actualizamos recordar si la autenticación fue exitosa
      await ApiService.registrarLoginExitoso(usuario, _recordarUsuario);

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const HomeScreen()),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).clearSnackBars();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _usuarioController.dispose();
    _passwordController.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight,
              ),
              child: IntrinsicHeight(
                child: Column(
                  children: [
                    // Sección superior azul (Cabecera adaptativa)
                    Container(
                      width: double.infinity,
                      padding: EdgeInsets.only(
                        top: MediaQuery.of(context).padding.top + 40,
                        bottom: 30,
                      ),
                      color: AppTheme.primaryBlue,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 90,
                            height: 90,
                            padding: const EdgeInsets.all(12),
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: Image.asset(
                              'assets/images/logo.png',
                              fit: BoxFit.contain,
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'MJLO',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.5,
                            ),
                          ),
                          const Text(
                            'TRÁNSITO MÓVIL',
                            style: TextStyle(
                              color: AppTheme.accentYellow,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Container(
                            margin: const EdgeInsets.only(top: 4, bottom: 12),
                            width: 60,
                            height: 2,
                            color: AppTheme.accentYellow,
                          ),
                          Text(
                            'Sistema de Control y Fiscalización Vial',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.7),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Sección inferior blanca/gris
                    Expanded(
                      child: Container(
                        color: AppTheme.backgroundLight,
                        padding: const EdgeInsets.symmetric(horizontal: 24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 24),
                            const Text(
                              'Ingreso de Personal',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: AppTheme.primaryBlue,
                              ),
                            ),
                            const SizedBox(height: 24),

                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Usuario',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                                if (_historialUsuarios.isNotEmpty)
                                  InkWell(
                                    onTap: _mostrarModalHistorial,
                                    borderRadius: BorderRadius.circular(6),
                                    child: const Padding(
                                      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            Icons.history_rounded,
                                            size: 14,
                                            color: AppTheme.primaryBlue,
                                          ),
                                          SizedBox(width: 4),
                                          Text(
                                            'Ver historial',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.primaryBlue,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _usuarioController,
                              textInputAction: TextInputAction.next,
                              onSubmitted: (_) => _passwordFocusNode.requestFocus(),
                              decoration: InputDecoration(
                                prefixIcon: const Icon(
                                  Icons.badge_outlined,
                                  color: Colors.grey,
                                ),
                                suffixIcon: _historialUsuarios.isNotEmpty
                                    ? IconButton(
                                        icon: const Icon(
                                          Icons.history_rounded,
                                          color: AppTheme.primaryBlue,
                                        ),
                                        tooltip: 'Cuentas recientes',
                                        onPressed: _mostrarModalHistorial,
                                      )
                                    : null,
                              ),
                            ),
                            if (_historialUsuarios.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                physics: const BouncingScrollPhysics(),
                                child: Row(
                                  children: [
                                    const Text(
                                      'Recientes: ',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    ..._historialUsuarios.take(4).map((u) {
                                      final isSelected = _usuarioController.text.trim().toLowerCase() == u.toLowerCase();
                                      return Padding(
                                        padding: const EdgeInsets.only(right: 6.0),
                                        child: ActionChip(
                                          visualDensity: VisualDensity.compact,
                                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                          avatar: Icon(
                                            Icons.person_outline_rounded,
                                            size: 14,
                                            color: isSelected ? Colors.white : AppTheme.primaryBlue,
                                          ),
                                          label: Text(
                                            u,
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: isSelected ? Colors.white : AppTheme.primaryBlue,
                                            ),
                                          ),
                                          backgroundColor: isSelected
                                              ? AppTheme.primaryBlue
                                              : AppTheme.primaryBlue.withOpacity(0.08),
                                          side: BorderSide(
                                            color: isSelected
                                                ? AppTheme.primaryBlue
                                                : AppTheme.primaryBlue.withOpacity(0.2),
                                          ),
                                          onPressed: () => _seleccionarUsuario(u),
                                        ),
                                      );
                                    }),
                                  ],
                                ),
                              ),
                            ],
                            const SizedBox(height: 16),

                            Text(
                              'CONTRASEÑA',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade600,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _passwordController,
                              focusNode: _passwordFocusNode,
                              obscureText: _obscurePassword,
                              textInputAction: TextInputAction.done,
                              onSubmitted: (_) => _signIn(),
                              decoration: InputDecoration(
                                prefixIcon: const Icon(
                                  Icons.lock_outline,
                                  color: Colors.grey,
                                ),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_off
                                        : Icons.visibility,
                                    color: Colors.grey,
                                  ),
                                  onPressed: () => setState(
                                    () => _obscurePassword = !_obscurePassword,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                SizedBox(
                                  height: 24,
                                  width: 24,
                                  child: Checkbox(
                                    value: _recordarUsuario,
                                    onChanged: (val) {
                                      setState(() => _recordarUsuario = val ?? false);
                                    },
                                    activeColor: AppTheme.primaryBlue,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Recordar mi usuario',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade700,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),

                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: _isLoading ? null : _signIn,
                                child: _isLoading
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: AppTheme.primaryBlue,
                                        ),
                                      )
                                    : const Text('INGRESAR AL SISTEMA'),
                              ),
                            ),

                            // El Spacer asegura que el copyright se empuje hasta el fondo
                            const Spacer(),
                            const SizedBox(height: 24),
                            Center(
                              child: Text(
                                '© Municipalidad Distrital de José Leonardo Ortiz\nSubgerencia de Tránsito y Seguridad Vial',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade500,
                                  height: 1.5,
                                ),
                              ),
                            ),
                            SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
