import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme.dart';
import '../utils/animaciones.dart';
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
      await ApiService.registrarLoginExitoso(
        usuario,
        password,
        _recordarUsuario,
      );

      final esTecnico = await ApiService.esInspectorTecnico();

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) =>
                esTecnico ? const TechnicalHomeScreen() : const HomeScreen(),
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

  Widget _etiqueta(String texto) => Text(
    texto,
    style: TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.3,
      color: Colors.grey.shade700,
    ),
  );

  Widget _circuloDecorativo(double tamano, Color color) => Container(
    width: tamano,
    height: tamano,
    decoration: BoxDecoration(shape: BoxShape.circle, color: color),
  );

  Widget _cabecera(BuildContext context) {
    const tamanoLogo = 80.0;
    return Stack(
      children: [
        Positioned(
          top: -50,
          right: -40,
          child: _circuloDecorativo(
            180,
            AppTheme.accentYellow.withOpacity(0.10),
          ),
        ),
        Positioned(
          top: 70,
          left: -60,
          child: _circuloDecorativo(150, Colors.white.withOpacity(0.05)),
        ),
        Container(
          width: double.infinity,
          padding: EdgeInsets.only(
            top: MediaQuery.of(context).padding.top + 24,
            bottom: 32,
          ),
          child: Column(
            children: [
              AparicionEscalonada(
                child: Container(
                  width: tamanoLogo,
                  height: tamanoLogo,
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.accentYellow, width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.25),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Image.asset(
                    'assets/images/app_icon.png',
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              AparicionEscalonada(
                indice: 1,
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    const Text(
                      'App Tránsito JLO',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const Text(
                      'TRÁNSITO MÓVIL',
                      style: TextStyle(
                        color: AppTheme.accentYellow,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.5,
                      ),
                    ),
                    Container(
                      margin: const EdgeInsets.only(top: 8, bottom: 12),
                      width: 48,
                      height: 3,
                      decoration: BoxDecoration(
                        color: AppTheme.accentYellow,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    Text(
                      'Sistema de Control y Fiscalización Vial',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.75),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primaryBlue,
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: IntrinsicHeight(
                child: Column(
                  children: [
                    _cabecera(context),

                    // Hoja inferior que sube sobre la cabecera
                    Expanded(
                      child: Container(
                        width: double.infinity,
                        decoration: const BoxDecoration(
                          color: AppTheme.backgroundLight,
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(32),
                          ),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 18),
                            AparicionEscalonada(
                              indice: 2,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Ingreso de personal',
                                    style: TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w900,
                                      color: AppTheme.primaryBlue,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Ingresa con tu usuario y contraseña asignados.',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),

                            AparicionEscalonada(
                              indice: 3,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _etiqueta('Usuario'),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: _usuarioController,
                                    textInputAction: TextInputAction.next,
                                    onSubmitted: (_) =>
                                        _passwordFocusNode.requestFocus(),
                                    decoration: const InputDecoration(
                                      hintText: 'Tu usuario',
                                      prefixIcon: Icon(
                                        Icons.badge_outlined,
                                        color: AppTheme.primaryBlue,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 14),

                            AparicionEscalonada(
                              indice: 4,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _etiqueta('Contraseña'),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: _passwordController,
                                    focusNode: _passwordFocusNode,
                                    obscureText: _obscurePassword,
                                    textInputAction: TextInputAction.done,
                                    onSubmitted: (_) => _signIn(),
                                    decoration: InputDecoration(
                                      hintText: 'Tu contraseña',
                                      prefixIcon: const Icon(
                                        Icons.lock_outline,
                                        color: AppTheme.primaryBlue,
                                      ),
                                      suffixIcon: IconButton(
                                        icon: Icon(
                                          _obscurePassword
                                              ? Icons.visibility_off_outlined
                                              : Icons.visibility_outlined,
                                          color: Colors.grey.shade600,
                                        ),
                                        onPressed: () => setState(
                                          () => _obscurePassword =
                                              !_obscurePassword,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),

                            AparicionEscalonada(
                              indice: 5,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(8),
                                onTap: () => setState(
                                  () => _recordarUsuario = !_recordarUsuario,
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 4,
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      SizedBox(
                                        height: 24,
                                        width: 24,
                                        child: Checkbox(
                                          value: _recordarUsuario,
                                          onChanged: (val) {
                                            setState(
                                              () => _recordarUsuario =
                                                  val ?? false,
                                            );
                                          },
                                          activeColor: AppTheme.primaryBlue,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              6,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Text(
                                        'Recordar mi usuario',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.grey.shade700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),

                            AparicionEscalonada(
                              indice: 6,
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: _isLoading
                                      ? null
                                      : [
                                          BoxShadow(
                                            color: AppTheme.accentYellow
                                                .withOpacity(0.45),
                                            blurRadius: 16,
                                            offset: const Offset(0, 6),
                                          ),
                                        ],
                                ),
                                child: SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton(
                                    onPressed: _isLoading ? null : _signIn,
                                    child: AnimatedSwitcher(
                                      duration: const Duration(
                                        milliseconds: 200,
                                      ),
                                      child: _isLoading
                                          ? const SizedBox(
                                              key: ValueKey('cargando'),
                                              height: 20,
                                              width: 20,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: AppTheme.primaryBlue,
                                              ),
                                            )
                                          : Row(
                                              key: const ValueKey('texto'),
                                              mainAxisAlignment:
                                                  MainAxisAlignment.center,
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Flexible(
                                                  child: Text(
                                                    'INGRESAR AL SISTEMA',
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                SizedBox(width: 8),
                                                Icon(
                                                  Icons.arrow_forward_rounded,
                                                  size: 20,
                                                ),
                                              ],
                                            ),
                                    ),
                                  ),
                                ),
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
                            SizedBox(
                              height:
                                  MediaQuery.of(context).padding.bottom + 16,
                            ),
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
