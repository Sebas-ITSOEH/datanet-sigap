/**
 * Módulo de Validación Dinámica
 * Valida campos del formulario de registro en tiempo real
 * Replicando la lógica del backend (registro.php)
 */

const ValidadorRegistro = {
  // Patrones regex (deben coincidir con los del backend registro.php)
  patrones: {
    nombreCompleto: /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*$/u,
    correoAlumno: /^\d{8}@secgralbj\.edu\.mx$/,
    correoDocente: /^[a-záéíóúñ]+\.[a-záéíóúñ]+@secgralbj\.edu\.mx$/u,
    telefono: /^\d{10}$/,
    matricula: /^\d{8}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/,
    correoGeneral: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    curp: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/,
    nss: /^\d{11}$/,
    rfc: /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/,
  },

  // Validar nombre
  validarNombre(valor) {
    const nombre = (valor || "").trim();
    if (nombre === "") {
      return { valido: false, mensaje: "El nombre es obligatorio." };
    }
    if (!this.patrones.nombreCompleto.test(nombre)) {
      return {
        valido: false,
        mensaje: "Cada palabra debe iniciar con mayúscula y contener solo letras.",
      };
    }
    return { valido: true, mensaje: "" };
  },

  // Validar apellido
  validarApellido(valor) {
    const apellido = (valor || "").trim();
    if (apellido === "") {
      return { valido: false, mensaje: "El apellido es obligatorio." };
    }
    if (!this.patrones.nombreCompleto.test(apellido)) {
      return {
        valido: false,
        mensaje: "Cada apellido debe iniciar con mayúscula y contener solo letras.",
      };
    }
    return { valido: true, mensaje: "" };
  },

  // Validar CURP
  validarCURP(valor) {
    const curp = (valor || "").trim().toUpperCase();
    if (curp === "") {
      return { valido: false, mensaje: "La CURP es obligatoria." };
    }
    if (curp.length !== 18) {
      return { valido: false, mensaje: "La CURP debe tener 18 caracteres." };
    }
    if (!this.patrones.curp.test(curp)) {
      return { valido: false, mensaje: "La CURP no tiene un formato válido." };
    }
    return { valido: true, mensaje: "" };
  },

  // Validar correo según rol detectado
  validarCorreo(valor) {
    const correo = (valor || "").trim().toLowerCase();
    if (correo === "") {
      return { valido: false, mensaje: "El correo es obligatorio." };
    }
    if (!this.patrones.correoGeneral.test(correo)) {
      return { valido: false, mensaje: "El formato del correo no es válido." };
    }
    const esAlumno = this.patrones.correoAlumno.test(correo);
    const esDocente = this.patrones.correoDocente.test(correo);
    if (!esAlumno && !esDocente) {
      return {
        valido: false,
        mensaje: "Debe ser un correo institucional válido (alumno o docente).",
      };
    }
    return { valido: true, mensaje: "" };
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

  // Validar matrícula escolar (8 dígitos)
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

  // Extraer matrícula del correo del alumno (primeros 8 dígitos)
  extraerMatriculaDelCorreo(correo) {
    const correoLimpio = (correo || "").trim().toLowerCase();
    const match = correoLimpio.match(/^(\d{8})@/);
    return match ? match[1] : "";
  },

  // Validar NSS
  validarNSS(valor) {
    const nss = (valor || "").trim();
    if (nss === "") {
      return { valido: false, mensaje: "El NSS es obligatorio." };
    }
    if (!this.patrones.nss.test(nss)) {
      return { valido: false, mensaje: "El NSS debe tener 11 dígitos." };
    }
    return { valido: true, mensaje: "" };
  },

  // Validar RFC
  validarRFC(valor) {
    const rfc = (valor || "").trim().toUpperCase();
    if (rfc === "") {
      return { valido: false, mensaje: "El RFC es obligatorio." };
    }
    if (rfc.length !== 13) {
      return { valido: false, mensaje: "El RFC debe tener 13 caracteres." };
    }
    if (!this.patrones.rfc.test(rfc)) {
      return { valido: false, mensaje: "El RFC no tiene un formato válido." };
    }
    return { valido: true, mensaje: "" };
  },

  // Validar clave de docente
  validarClaveDocente(valor) {
    const clave = (valor || "").trim();
    if (clave === "") {
      return { valido: false, mensaje: "La clave de docente es obligatoria." };
    }
    if (clave.length < 3) {
      return { valido: false, mensaje: "La clave debe tener al menos 3 caracteres." };
    }
    return { valido: true, mensaje: "" };
  },

  // Validar contraseña (con verificación de requisitos individuales)
  validarPassword(valor) {
    const password = valor || "";
    const requisitos = {
      longitud: password.length >= 8 && password.length <= 12,
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
    return { valido: true, mensaje: "", requisitos };
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
  rolSeleccionado: null,

  campos: {
    nombre: {
      validador: (v) => ValidadorRegistro.validarNombre(v),
      feedback: "nombre-feedback",
    },
    apellidos: {
      validador: (v) => ValidadorRegistro.validarApellido(v),
      feedback: "apellidos-feedback",
    },
    curp: {
      validador: (v) => ValidadorRegistro.validarCURP(v),
      feedback: "curp-feedback",
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
      validador: (v) =>
        ValidadorRegistro.validarConfirmPassword(
          document.getElementById("pass")?.value || "",
          v
        ),
      feedback: "confirmPass-feedback",
    },
    telTutor: {
      validador: (v) => ValidadorRegistro.validarTelefono(v),
      feedback: "telTutor-feedback",
    },
    matricula_escolar: {
      validador: (v) => ValidadorRegistro.validarMatricula(v),
      feedback: "matricula_escolar-feedback",
    },
    nss: {
      validador: (v) => ValidadorRegistro.validarNSS(v),
      feedback: "nss-feedback",
    },
    rfc: {
      validador: (v) => ValidadorRegistro.validarRFC(v),
      feedback: "rfc-feedback",
    },
    clave_docente: {
      validador: (v) => ValidadorRegistro.validarClaveDocente(v),
      feedback: "clave_docente-feedback",
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
        const confirmPassInput = document.getElementById("confirmPass");
        if (confirmPassInput && confirmPassInput.value) {
          this.validarCampo("confirmPass");
        }
      });
    }

    const confirmPassInput = document.getElementById("confirmPass");
    if (confirmPassInput) {
      confirmPassInput.addEventListener("input", () =>
        this.validarCampo("confirmPass")
      );
    }
  },

  validarCampo(idCampo) {
    const elemento = document.getElementById(idCampo);
    if (!elemento) return { valido: true };

    const campoConfig = this.campos[idCampo];
    if (!campoConfig) return { valido: true };

    const resultado = campoConfig.validador(elemento.value);

    this.mostrarFeedback(idCampo, resultado);
    this.actualizarEstadoInput(elemento, resultado.valido);

    if (idCampo === "pass" && resultado.requisitos) {
      this.actualizarRequisitosPassword(resultado.requisitos);
    }

    return resultado;
  },

  mostrarFeedback(idCampo, resultado) {
    const feedbackElementId = this.campos[idCampo]?.feedback;
    if (!feedbackElementId) return;

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

  validarPaso2() {
    const camposValidar = ["nombre", "apellidos", "curp", "email"];
    const todosValidos = camposValidar.every((idCampo) => {
      const resultado = this.validarCampo(idCampo);
      return resultado.valido;
    });
    return todosValidos;
  },

  validarPaso3() {
    const rol = this.rolSeleccionado;
    let camposValidar = ["pass", "confirmPass"];

    if (rol === "alumno") {
      camposValidar.push("matricula_escolar", "telTutor");
    } else if (rol === "docente") {
      camposValidar.push("clave_docente", "nss", "rfc");
    }

    const todosValidos = camposValidar.every((idCampo) => {
      const resultado = this.validarCampo(idCampo);
      return resultado.valido;
    });
    return todosValidos;
  },

  // Extraer matrícula del correo y autocompletar el campo
  autocompletarMatricula() {
    const emailInput = document.getElementById("email");
    const matriculaInput = document.getElementById("matricula_escolar");
    
    if (!emailInput || !matriculaInput) return;
    
    const correo = emailInput.value.trim().toLowerCase();
    const matricula = ValidadorRegistro.extraerMatriculaDelCorreo(correo);
    
    matriculaInput.value = matricula;
    
    // Validar la matrícula si tiene valor
    if (matricula) {
      this.validarCampo("matricula_escolar");
    }
  },

  esEmailAlumno(email) {
    return ValidadorRegistro.patrones.correoAlumno.test(
      email.trim().toLowerCase()
    );
  },

  agregarListenersParaTipoRol() {
    const telTutor = document.getElementById("telTutor");
    const matriculaEscolar = document.getElementById("matricula_escolar");
    const claveDocente = document.getElementById("clave_docente");
    const nss = document.getElementById("nss");
    const rfc = document.getElementById("rfc");

    if (telTutor) {
      telTutor.addEventListener("input", () => this.validarCampo("telTutor"));
      telTutor.addEventListener("blur", () => this.validarCampo("telTutor"));
    }
    
    if (matriculaEscolar) {
      matriculaEscolar.addEventListener("input", () => this.validarCampo("matricula_escolar"));
      matriculaEscolar.addEventListener("blur", () => this.validarCampo("matricula_escolar"));
    }

    if (claveDocente) {
      claveDocente.addEventListener("input", () => this.validarCampo("clave_docente"));
      claveDocente.addEventListener("blur", () => this.validarCampo("clave_docente"));
    }
    
    if (nss) {
      nss.addEventListener("input", () => this.validarCampo("nss"));
      nss.addEventListener("blur", () => this.validarCampo("nss"));
    }
    
    if (rfc) {
      rfc.addEventListener("input", () => this.validarCampo("rfc"));
      rfc.addEventListener("blur", () => this.validarCampo("rfc"));
    }
  },
};
