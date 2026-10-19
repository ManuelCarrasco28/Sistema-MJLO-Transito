import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme.dart';
import 'home_screen.dart';
import 'technical_home_screen.dart';

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
          final usuario = config['usuario'] as String?;
          final password = config['password'] as String?;
          if (_recordarUsuario && usuario != null && usuario.isNotEmpty) {
            _usuarioController.text = usuario;
            if (password != null && password.isNotEmpty) {
              _passwordController.text = password;
            }
          }
        });
      }
    } catch (_) {}
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
      await ApiService.registrarLoginExitoso(usuario, password, _recordarUsuario);

      final esTecnico = await ApiService.esInspectorTecnico();

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => esTecnico ? const TechnicalHomeScreen() : const HomeScreen(),
          ),
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

                            Text(
                              'Usuario',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade600,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _usuarioController,
                              textInputAction: TextInputAction.next,
                              onSubmitted: (_) => _passwordFocusNode.requestFocus(),
                              decoration: const InputDecoration(
                                prefixIcon: Icon(
                                  Icons.badge_outlined,
                                  color: Colors.grey,
                                ),
                              ),
                            ),
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
