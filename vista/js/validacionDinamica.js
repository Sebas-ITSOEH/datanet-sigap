/**
 * Módulo de Validación Dinámica
 * Valida campos del formulario de registro en tiempo real
 * Replicando la lógica del backend (registro.php)
 */

const ValidadorRegistro = {
  // Patrones regex (deben coincidir con los del backend)
  patrones: {
    nombreCompleto: /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*$/u,

    correoAlumno: /^\d{8}@secgralbj\.edu\.mx$/,

    correoDocente: /^[a-záéíóúñ]+\.[a-záéíóúñ]+@secgralbj\.edu\.mx$/u,

    telefono: /^\d{10}$/,

    matricula: /^\d{8}$/,

    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,

    correoGeneral: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  // Validar nombre
  validarNombre(valor) {
    const nombre = (valor || "").trim();

    if (nombre === "") {
      return {
        valido: false,
        mensaje: "El nombre es obligatorio.",
      };
    }

    if (!this.patrones.nombreCompleto.test(nombre)) {
      return {
        valido: false,
        mensaje:
          "Cada palabra debe iniciar con mayúscula y contener solo letras.",
      };
    }

    return {
      valido: true,
      mensaje: "",
    };
  },

  // Validar apellido
  validarApellido(valor) {
    const apellido = (valor || "").trim();

    if (apellido === "") {
      return {
        valido: false,
        mensaje: "El apellido es obligatorio.",
      };
    }

    if (!this.patrones.nombreCompleto.test(apellido)) {
      return {
        valido: false,
        mensaje:
          "Cada apellido debe iniciar con mayúscula y contener solo letras.",
      };
    }

    return {
      valido: true,
      mensaje: "",
    };
  },

  // Validar dirección
  validarDireccion(valor) {
    const direccion = (valor || "").trim();
    if (direccion === "") {
      return { valido: false, mensaje: "La dirección es obligatoria." };
    }
    return { valido: true, mensaje: "" };
  },

  // Validar correo según rol detectado
  validarCorreo(valor) {
    const correo = (valor || "").trim().toLowerCase();

    if (correo === "") {
      return {
        valido: false,
        mensaje: "El correo es obligatorio.",
      };
    }

    if (!this.patrones.correoGeneral.test(correo)) {
      return {
        valido: false,
        mensaje: "El formato del correo no es válido.",
      };
    }

    const esAlumno = this.patrones.correoAlumno.test(correo);

    const esDocente = this.patrones.correoDocente.test(correo);

    if (!esAlumno && !esDocente) {
      return {
        valido: false,
        mensaje: "Debe ser un correo institucional válido de alumno o docente.",
      };
    }

    return {
      valido: true,
      mensaje: "",
    };
  },

  // Validar correo de tutor
  validarCorreoTutor(valor) {
    const correo = (valor || "").trim().toLowerCase();

    if (correo === "") {
      return {
        valido: false,
        mensaje: "El correo del tutor es obligatorio.",
      };
    }

    if (!this.patrones.correoGeneral.test(correo)) {
      return {
        valido: false,
        mensaje: "Ingresa un correo válido.",
      };
    }

    return {
      valido: true,
      mensaje: "",
    };
  },

  // Validación básica de email (usando regex simple)
  esCorreoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  },

  // Validar teléfono
  validarTelefono(valor) {
    const telefono = (valor || "").trim();
    if (telefono === "") {
      return { valido: false, mensaje: "El teléfono es obligatorio." };
    }
    if (!this.patrones.telefono.test(telefono)) {
      return { valido: false, mensaje: "El teléfono debe tener 10 dígitos." };
    }
    return { valido: true, mensaje: "" };
  },

  // Validar matrícula escolar
  validarMatricula(valor) {
    const matricula = (valor || "").trim();
    if (matricula === "") {
      return { valido: false, mensaje: "La matrícula escolar es obligatoria." };
    }
    if (!this.patrones.matricula.test(matricula)) {
      return { valido: false, mensaje: "La matrícula debe tener 8 dígitos." };
    }
    return { valido: true, mensaje: "" };
  },

  // Validar contraseña (con verificación de requisitos individuales)
  validarPassword(valor) {
    const password = valor || "";

    const requisitos = {
      longitud: password.length >= 8,
      mayuscula: /[A-Z]/.test(password),
      minuscula: /[a-z]/.test(password),
      numero: /\d/.test(password),
      especial: /[^A-Za-z0-9]/.test(password),
    };

    const todosValidos = Object.values(requisitos).every((r) => r);

    if (password === "") {
      return {
        valido: false,
        mensaje: "La contraseña es obligatoria.",
        requisitos,
      };
    }

    if (!todosValidos) {
      return {
        valido: false,
        mensaje: "La contraseña no cumple los requisitos.",
        requisitos,
      };
    }

    return {
      valido: true,
      mensaje: "",
      requisitos,
    };
  },

  // Validar coincidencia de contraseñas
  validarConfirmPassword(password, confirmPassword) {
    const pass = password || "";
    const confirmPass = confirmPassword || "";

    if (confirmPass === "") {
      return { valido: false, mensaje: "Debes confirmar la contraseña." };
    }

    if (pass !== confirmPass) {
      return { valido: false, mensaje: "Las contraseñas no coinciden." };
    }

    return { valido: true, mensaje: "" };
  },
};

/**
 * Gestor de Validación en Tiempo Real
 * Maneja los eventos y la visualización de errores
 */
const GestorValidacion = {
  campos: {
    nombre: {
      validador: (v) => ValidadorRegistro.validarNombre(v),
      feedback: "nombre-feedback",
    },
    apellidos: {
      validador: (v) => ValidadorRegistro.validarApellido(v),
      feedback: "apellidos-feedback",
    },
    tutorMaterno: {
      validador: (v) => ValidadorRegistro.validarApellido(v),
      feedback: "tutorMaterno-feedback",
    },
    direccion: {
      validador: (v) => ValidadorRegistro.validarDireccion(v),
      feedback: "direccion-feedback",
    },
    email: {
      validador: (v) => ValidadorRegistro.validarCorreo(v),
      feedback: "email-feedback",
    },
    pass: {
      validador: (v) => ValidadorRegistro.validarPassword(v),
      feedback: "pass-feedback",
    },
    confirmPass: {
      validador: (v, deps) =>
        ValidadorRegistro.validarConfirmPassword(
          document.getElementById("pass")?.value || "",
          v,
        ),
      feedback: "confirmPass-feedback",
    },
    tutorPaterno: {
      validador: (v) => ValidadorRegistro.validarApellido(v),
      feedback: "tutorPaterno-feedback",
    },
    tutorNombres: {
      validador: (v) => ValidadorRegistro.validarNombre(v),
      feedback: "tutorNombres-feedback",
    },
    tutorCorreo: {
      validador: (v) => ValidadorRegistro.validarCorreoTutor(v),
      feedback: "tutorCorreo-feedback",
    },
    telTutor: {
      validador: (v) => ValidadorRegistro.validarTelefono(v),
      feedback: "telTutor-feedback",
    },
  },

  inicializar() {
    // Agregar listeners a todos los campos
    Object.keys(this.campos).forEach((idCampo) => {
      const elemento = document.getElementById(idCampo);
      if (elemento) {
        elemento.addEventListener("input", () => this.validarCampo(idCampo));
        elemento.addEventListener("blur", () => this.validarCampo(idCampo));
        elemento.addEventListener("change", () => this.validarCampo(idCampo));
      }
    });

    // Validar confirmPassword cuando cambie la password
    const passInput = document.getElementById("pass");
    if (passInput) {
      passInput.addEventListener("input", () => {
        this.validarCampo("pass");
        // Revalidar confirmPass si ya tiene valor
        const confirmPassInput = document.getElementById("confirmPass");
        if (confirmPassInput && confirmPassInput.value) {
          this.validarCampo("confirmPass");
        }
      });
    }

    // Validar confirmPass cuando cambie
    const confirmPassInput = document.getElementById("confirmPass");
    if (confirmPassInput) {
      confirmPassInput.addEventListener("input", () =>
        this.validarCampo("confirmPass"),
      );
    }
  },

  validarCampo(idCampo) {
    const elemento = document.getElementById(idCampo);
    if (!elemento) return { valido: true };

    const campoConfig = this.campos[idCampo];
    if (!campoConfig) return { valido: true };

    const resultado = campoConfig.validador(elemento.value);

    // Actualizar feedback visual
    this.mostrarFeedback(idCampo, resultado);

    // Actualizar estado del input
    this.actualizarEstadoInput(elemento, resultado.valido);

    // Actualizar requisitos si es password
    if (idCampo === "pass" && resultado.requisitos) {
      this.actualizarRequisitosPassword(resultado.requisitos);
    }

    return resultado;
  },

  mostrarFeedback(idCampo, resultado) {
    const feedbackElementId = this.campos[idCampo].feedback;
    const feedbackElement = document.getElementById(feedbackElementId);

    if (!feedbackElement) return;

    if (resultado.valido) {
      feedbackElement.textContent = "";
      feedbackElement.className = "validation-feedback";
    } else {
      feedbackElement.textContent = "✗ " + resultado.mensaje;
      feedbackElement.className = "validation-feedback error";
    }
  },

  actualizarEstadoInput(elemento, esValido) {
    if (esValido) {
      elemento.classList.remove("input-invalid");
      elemento.classList.add("input-valid");
    } else {
      elemento.classList.remove("input-valid");
      elemento.classList.add("input-invalid");
    }
  },

  actualizarRequisitosPassword(requisitos) {
    const idRequisitos = [
      "req-length",
      "req-upper",
      "req-lower",
      "req-number",
      "req-special",
    ];

    const valoresRequisitos = [
      requisitos.longitud,
      requisitos.mayuscula,
      requisitos.minuscula,
      requisitos.numero,
      requisitos.especial,
    ];

    idRequisitos.forEach((id, index) => {
      const elemento = document.getElementById(id);
      if (elemento) {
        if (valoresRequisitos[index]) {
          elemento.classList.add("met");
          elemento.classList.remove("unmet");
        } else {
          elemento.classList.add("unmet");
          elemento.classList.remove("met");
        }
      }
    });
  },

  validarFormularioCompleto(step = 1) {
    const camposValidar =
      step === 1
        ? ["nombre", "apellidos", "direccion", "email"]
        : ["pass", "confirmPass"];

    const todosValidos = camposValidar.every((idCampo) => {
      const resultado = this.validarCampo(idCampo);
      return resultado.valido;
    });

    return todosValidos;
  },

  esEmailAlumno(email) {
    return ValidadorRegistro.patrones.correoAlumno.test(
      email.trim().toLowerCase(),
    );
  },

  validarMatriculaEscolar() {
    const elemento = document.getElementById("id-valor");
    if (!elemento) return true;

    const esAlumno = this.esEmailAlumno(
      document.getElementById("email")?.value || "",
    );
    if (!esAlumno) return true; // Solo para alumnos

    const resultado = ValidadorRegistro.validarMatricula(elemento.value);

    // Mostrar feedback para matrícula
    const feedbackElement = document.getElementById("id-valor-feedback");
    if (feedbackElement) {
      if (resultado.valido) {
        feedbackElement.textContent = "";
        feedbackElement.className = "validation-feedback";
      } else {
        feedbackElement.textContent = "✗ " + resultado.mensaje;
        feedbackElement.className = "validation-feedback error";
      }
    }

    this.actualizarEstadoInput(elemento, resultado.valido);
    return resultado.valido;
  },

  agregarListenerMatricula() {
    const elemento = document.getElementById("id-valor");
    if (elemento) {
      elemento.addEventListener("input", () => this.validarMatriculaEscolar());
      elemento.addEventListener("blur", () => this.validarMatriculaEscolar());
    }
  },

  validarTutorCompleto() {
    const esAlumno = this.esEmailAlumno(
      document.getElementById("email")?.value || "",
    );
    if (!esAlumno) return true;

    const campos = ["tutorPaterno", "tutorNombres", "tutorCorreo", "telTutor"];
    const incompleto = campos.some((id) => {
      const elemento = document.getElementById(id);
      return !elemento || !elemento.value.trim();
    });

    const todoValido = campos.every((id) => {
      const resultado = this.validarCampo(id);
      return resultado.valido;
    });

    return !incompleto && todoValido;
  },
};
