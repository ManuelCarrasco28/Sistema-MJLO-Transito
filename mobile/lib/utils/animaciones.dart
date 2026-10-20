import 'package:flutter/material.dart';

/// Los tres widgets respetan «Quitar animaciones» del sistema: con esa opción activa el contenido se muestra
/// al instante, sin movimiento.

/// Aparición de un elemento al entrar en pantalla: se desvanece y sube unos píxeles.
/// [indice] escalona la entrada de varios elementos con un solo controlador por elemento.
class AparicionEscalonada extends StatefulWidget {
  const AparicionEscalonada({
    super.key,
    required this.child,
    this.indice = 0,
    this.desplazamiento = 18,
  });

  final Widget child;
  final int indice;
  final double desplazamiento;

  @override
  State<AparicionEscalonada> createState() => _AparicionEscalonadaState();
}

class _AparicionEscalonadaState extends State<AparicionEscalonada>
    with SingleTickerProviderStateMixin {
  static const _duracionBase = 380;
  static const _pasoMs = 70;

  late final AnimationController _controller;
  late final Animation<double> _curva;
  bool _iniciada = false;

  @override
  void initState() {
    super.initState();
    final retraso = (widget.indice * _pasoMs).clamp(0, 420);
    final total = _duracionBase + retraso;
    _controller = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: total),
    );
    _curva = CurvedAnimation(
      parent: _controller,
      curve: Interval(retraso / total, 1, curve: Curves.easeOutCubic),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_iniciada) return;
    _iniciada = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.value = 1;
    } else {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _curva,
      child: widget.child,
      builder: (context, child) => Opacity(
        opacity: _curva.value,
        child: Transform.translate(
          offset: Offset(0, (1 - _curva.value) * widget.desplazamiento),
          child: child,
        ),
      ),
    );
  }
}

/// Reduce un poco el elemento mientras se mantiene presionado y lo devuelve al soltar.
/// No intercepta el toque: el [child] sigue recibiendo sus propios gestos.
class PulsarAlTocar extends StatefulWidget {
  const PulsarAlTocar({super.key, required this.child, this.escala = 0.97});

  final Widget child;
  final double escala;

  @override
  State<PulsarAlTocar> createState() => _PulsarAlTocarState();
}

class _PulsarAlTocarState extends State<PulsarAlTocar> {
  bool _presionado = false;

  void _cambiar(bool valor) {
    if (_presionado != valor && mounted) setState(() => _presionado = valor);
  }

  @override
  Widget build(BuildContext context) {
    final sinAnimaciones = MediaQuery.disableAnimationsOf(context);
    return Listener(
      onPointerDown: (_) => _cambiar(true),
      onPointerUp: (_) => _cambiar(false),
      onPointerCancel: (_) => _cambiar(false),
      child: AnimatedScale(
        scale: _presionado && !sinAnimaciones ? widget.escala : 1,
        duration: sinAnimaciones
            ? Duration.zero
            : const Duration(milliseconds: 110),
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}

/// Número que sube desde su valor anterior hasta el nuevo cuando cambia.
class NumeroAnimado extends StatelessWidget {
  const NumeroAnimado({super.key, required this.valor, this.estilo});

  final int valor;
  final TextStyle? estilo;

  @override
  Widget build(BuildContext context) {
    final sinAnimaciones = MediaQuery.disableAnimationsOf(context);
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(end: valor.toDouble()),
      duration: sinAnimaciones
          ? Duration.zero
          : const Duration(milliseconds: 600),
      curve: Curves.easeOutCubic,
      builder: (context, v, _) => Text('${v.round()}', style: estilo),
    );
  }
}
