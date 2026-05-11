// Función que se llama después de cargar el componente registro
window.inicializarRegistro = function () {
  // Inicializar validación dinámica
  GestorValidacion.inicializar();

  // Paso 1: Seleccionar rol
  const rolAlumno = document.getElementById("rol-alumno");
  const rolDocente = document.getElementById("rol-docente");
  const btnSeleccionarRol = document.getElementById("btnSeleccionarRol");

  if (rolAlumno) {
    rolAlumno.addEventListener("click", () => seleccionarRol("alumno"));
    rolAlumno.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        seleccionarRol("alumno");
      }
    });
  }

  if (rolDocente) {
    rolDocente.addEventListener("click", () => seleccionarRol("docente"));
    rolDocente.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        seleccionarRol("docente");
      }
    });
  }

  if (btnSeleccionarRol) {
    btnSeleccionarRol.addEventListener("click", () => {
      if (GestorValidacion.rolSeleccionado) {
        irAStep2();
      }
    });
  }

  // Paso 2: Botones siguiente y atrás
  const btnSiguiente = document.getElementById("btnSiguiente");
  const btnAtrasPaso2 = document.getElementById("btnAtrasPaso2");

  if (btnSiguiente) {
    btnSiguiente.addEventListener("click", () => {
      if (GestorValidacion.validarPaso2()) {
        irAStep3();
      } else {
        mostrarNotificacion("Por favor, completa todos los campos correctamente.", "error");
      }
    });
  }

  if (btnAtrasPaso2) {
    btnAtrasPaso2.addEventListener("click", () => {
      volverAStep1();
    });
  }

  // Paso 3: Formulario submit
  const regForm = document.getElementById("regForm");
  const btnAtrasPaso3 = document.getElementById("btnAtrasPaso3");

  if (regForm) {
    regForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (GestorValidacion.validarPaso3()) {
        confirmarRegistro();
      } else {
        mostrarNotificacion("Por favor, completa todos los campos correctamente.", "error");
      }
    });
  }

  if (btnAtrasPaso3) {
    btnAtrasPaso3.addEventListener("click", () => {
      volverAStep2();
    });
  }

  // Convertir CURP a mayúsculas al escribir
  const curpInput = document.getElementById("curp");
  if (curpInput) {
    curpInput.addEventListener("input", function() {
      this.value = this.value.toUpperCase();
      GestorValidacion.validarCampo("curp");
    });
  }
};

function seleccionarRol(rol) {
  GestorValidacion.rolSeleccionado = rol;

  const rolAlumno = document.getElementById("rol-alumno");
  const rolDocente = document.getElementById("rol-docente");
  const btnSeleccionarRol = document.getElementById("btnSeleccionarRol");

  // Remover selección anterior
  if (rolAlumno) rolAlumno.classList.remove("selected");
  if (rolDocente) rolDocente.classList.remove("selected");

  // Seleccionar nuevo rol
  if (rol === "alumno") {
    if (rolAlumno) rolAlumno.classList.add("selected");
  } else {
    if (rolDocente) rolDocente.classList.add("selected");
  }

  // Habilitar botón
  if (btnSeleccionarRol) {
    btnSeleccionarRol.disabled = false;
  }
}

function irAStep2() {
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const dot2 = document.getElementById("dot2");

  if (step1) {
    step1.style.opacity = "0";
    step1.style.transform = "translateX(-20px)";
    step1.style.transition = "all 0.3s ease";
  }

  setTimeout(() => {
    if (step1) step1.style.display = "none";
    if (step2) {
      step2.style.display = "block";
      setTimeout(() => {
        step2.style.opacity = "1";
        step2.style.transform = "translateX(0)";
      }, 50);
    }
    if (dot2) dot2.classList.add("active");
  }, 300);
}

function volverAStep1() {
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const dot2 = document.getElementById("dot2");

  if (step2) {
    step2.style.opacity = "0";
    step2.style.transform = "translateX(20px)";
    step2.style.transition = "all 0.3s ease";
  }

  setTimeout(() => {
    if (step2) step2.style.display = "none";
    if (step1) {
      step1.style.display = "block";
      setTimeout(() => {
        step1.style.opacity = "1";
        step1.style.transform = "translateX(0)";
      }, 50);
    }
    if (dot2) dot2.classList.remove("active");
  }, 300);

  GestorValidacion.rolSeleccionado = null;
}

function irAStep3() {
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");
  const dot3 = document.getElementById("dot3");
  const rol = GestorValidacion.rolSeleccionado;

  // Mostrar/ocultar campos según rol
  const seccionAlumno = document.getElementById("seccion-alumno");
  const seccionDocente = document.getElementById("seccion-docente");

  if (rol === "alumno") {
    if (seccionAlumno) seccionAlumno.style.display = "block";
    if (seccionDocente) seccionDocente.style.display = "none";
  } else {
    if (seccionAlumno) seccionAlumno.style.display = "none";
    if (seccionDocente) seccionDocente.style.display = "block";
  }

  // Agregar listeners para campos específicos del rol
  GestorValidacion.agregarListenersParaTipoRol();

  if (step2) {
    step2.style.opacity = "0";
    step2.style.transform = "translateX(-20px)";
    step2.style.transition = "all 0.3s ease";
  }

  setTimeout(() => {
    if (step2) step2.style.display = "none";
    if (step3) {
      step3.style.display = "block";
      setTimeout(() => {
        step3.style.opacity = "1";
        step3.style.transform = "translateX(0)";
      }, 50);
    }
    if (dot3) dot3.classList.add("active");
  }, 300);
}

function volverAStep2() {
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");
  const dot3 = document.getElementById("dot3");

  if (step3) {
    step3.style.opacity = "0";
    step3.style.transform = "translateX(20px)";
    step3.style.transition = "all 0.3s ease";
  }

  setTimeout(() => {
    if (step3) step3.style.display = "none";
    if (step2) {
      step2.style.display = "block";
      setTimeout(() => {
        step2.style.opacity = "1";
        step2.style.transform = "translateX(0)";
      }, 50);
    }
    if (dot3) dot3.classList.remove("active");
  }, 300);
}

function confirmarRegistro() {
  const rol = GestorValidacion.rolSeleccionado;
  const btnSubmit = document.querySelector("#regForm button[type='submit']");
  const textoOriginal = btnSubmit?.textContent || "Confirmar vía WhatsApp";

  const codigoGenerado = Math.floor(1000 + Math.random() * 9000);

  mostrarNotificacion("Enviando código de confirmación...", "info");

  setTimeout(() => {
    const inputCodigo = prompt(
      `WHATSAPP SIMULADO\n\nTu código de confirmación es: ${codigoGenerado}\n\nIngresa el código para finalizar el registro:`
    );

    if (inputCodigo == codigoGenerado) {
      enviarRegistro();
    } else if (inputCodigo !== null) {
      mostrarNotificacion("Código incorrecto. Intenta de nuevo.", "error");
    }
  }, 800);
}

async function enviarRegistro() {
  const rol = GestorValidacion.rolSeleccionado;
  const btnSubmit = document.querySelector("#regForm button[type='submit']");
  const textoOriginal = btnSubmit?.textContent || "Confirmar vía WhatsApp";

  if (btnSubmit) {
    btnSubmit.textContent = "Guardando...";
    btnSubmit.disabled = true;
  }

  const payload = {
    nombre: document.getElementById("nombre")?.value.trim() || "",
    apellido: document.getElementById("apellidos")?.value.trim() || "",
    curp: document.getElementById("curp")?.value.trim().toUpperCase() || "",
    correo: document.getElementById("email")?.value.trim().toLowerCase() || "",
    password: document.getElementById("pass")?.value || "",
    rol: rol,
    matricula_escolar: rol === "alumno" ? "" : null,
    telefono: rol === "alumno" ? (document.getElementById("telTutor")?.value.trim() || "") : null,
    clave_docente: rol === "docente" ? (document.getElementById("id-valor")?.value.trim() || "") : null,
    nss: rol === "docente" ? (document.getElementById("nss")?.value.trim() || "") : null,
    rfc: rol === "docente" ? (document.getElementById("rfc")?.value.trim().toUpperCase() || "") : null,
  };

  try {
    const response = await fetch("controlador/registro.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.mensaje || "No fue posible completar el registro");
    }

    mostrarNotificacion("Registro exitoso. Redirigiendo al login...", "success");
    setTimeout(() => {
      const evento = new CustomEvent("cambiarVista", { detail: "login" });
      document.dispatchEvent(evento);
    }, 1200);
  } catch (error) {
    mostrarNotificacion(error.message, "error");
    if (btnSubmit) {
      btnSubmit.textContent = textoOriginal;
      btnSubmit.disabled = false;
    }
  }
}

function mostrarNotificacion(mensaje, tipo) {
  const notif = document.createElement("div");
  notif.textContent = mensaje;
  notif.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 10px;
    color: white;
    font-weight: 600;
    z-index: 1000;
    animation: slideInRight 0.3s ease;
    background: ${tipo === "error" ? "#A1232E" : tipo === "success" ? "#2d6a4f" : "#192A56"};
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.animation = "slideOutRight 0.3s ease forwards";
    setTimeout(() => notif.remove(), 300);
  }, 3500);
}