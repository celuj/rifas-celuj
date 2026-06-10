let seleccionados = new Set();

// 🔑 CLAVE ADMIN
let CLAVE_ADMIN = "316523";

// 🔥 ADMIN
let ES_ADMIN = false;

// 🆕 TIPO TALONARIO
let TIPO_TALONARIO = "normal";

// ⚙️ CONFIG
let CONFIG = {
  nequi: "3003704654",
  whatsapp: "3003704654"
};

const grid = document.getElementById("grid");

// 🔥 CONTROL FIREBASE
let unsubscribe = null;

// 🔒 BLOQUEO RESERVA
let bloqueando = false;

// =========================
// 🔢 GENERAR TALONARIOS
// =========================

function generarGrid() {
  grid.innerHTML = "";
  seleccionados.clear();

  if (TIPO_TALONARIO === "normal") {
    for (let i = 0; i < 100; i++) {
      let num = i.toString().padStart(2, "0");
      crearCasilla(num);
    }
  }

  if (TIPO_TALONARIO === "mini") {
    for (let i = 0; i < 10; i++) {
      let num = i.toString();
      crearCasilla(num);
    }
  }

  if (TIPO_TALONARIO === "combo") {
    db.collection("config").doc("combos").get().then(doc => {

      if (doc.exists) {
        let lista = doc.data().lista;

        lista.forEach(combo => {
          crearCasilla(combo);
        });

      } else {

        let usados = new Set();
        let lista = [];

        while (usados.size < 100) {
          let a = Math.floor(Math.random() * 100).toString().padStart(2, "0");
          let b = Math.floor(Math.random() * 100).toString().padStart(2, "0");

          if (a !== b && !usados.has(a) && !usados.has(b)) {
            usados.add(a);
            usados.add(b);

            let combo = `${a} - ${b}`;
            lista.push(combo);
          }
        }

        db.collection("config").doc("combos").set({
          lista: lista
        });

        lista.forEach(combo => {
          crearCasilla(combo);
        });
      }

    });
  }
}

// 🧱 CREAR CASILLA
function crearCasilla(texto) {
  let div = document.createElement("div");

  div.classList.add("numero");
  div.innerText = texto;
  div.onclick = () => seleccionar(div, texto);

  grid.appendChild(div);
}

// 🎯 SELECCIONAR (🔥 MEJORADO CON BLOQUEO VISUAL)
function seleccionar(elemento, num) {

  // ❌ si ya está ocupado
  if (elemento.classList.contains("ocupado")) {
    alert("❌ Número ocupado");
    return;
  }

  // ❌ si ya está bloqueado temporalmente
  if (elemento.classList.contains("bloqueado")) {
    return;
  }

  // 🔥 BLOQUEO INMEDIATO (GRIS)
  elemento.classList.add("bloqueado");

  // 👉 evitar doble click rápido
  elemento.style.pointerEvents = "none";

  // 🔥 lógica original (NO TOCADA)
  if (elemento.classList.contains("seleccionado")) {
    elemento.classList.remove("seleccionado");
    seleccionados.delete(num);
    elemento.classList.remove("bloqueado"); // desbloquea si deselecciona
    elemento.style.pointerEvents = "auto";
  } else {
    elemento.classList.add("seleccionado");
    seleccionados.add(num);

    // 🔥 abrir formulario automático
    document.getElementById("formulario").style.display = "block";

    setTimeout(() => {
      document.getElementById("nombre").focus();
    }, 100);
  }
}

// 📋 FORMULARIO
function mostrarFormulario() {
  if (seleccionados.size === 0) {
    alert("Selecciona al menos un número");
    return;
  }
  document.getElementById("formulario").style.display = "block";
}

// 💾 RESERVAR (PRO)
async function confirmarReserva() {

  if (bloqueando) return;
  bloqueando = true;

  let nombre = document.getElementById("nombre").value;
  let telefono = document.getElementById("telefono").value;

  if (!nombre || !telefono) {
    alert("Completa los datos");
    bloqueando = false;
    return;
  }

  // 🔍 VALIDAR SI YA EXISTE
  for (let num of seleccionados) {
    let doc = await db.collection("rifa").doc(num).get();

    if (doc.exists) {
      alert("❌ Uno de los números ya fue tomado: " + num);
      bloqueando = false;
      return;
    }
  }

  // 💾 GUARDAR
  for (let num of seleccionados) {
    await db.collection("rifa").doc(num).set({
      nombre,
      telefono,
      numero: num,
      fecha: new Date().toLocaleString(),
      pagado: false
    });
  }

 let numeros = [...seleccionados].join(", ");
enviarWhatsApp(nombre, numeros, telefono);
  alert("✅ Reserva hecha");

  seleccionados.clear();
  document.getElementById("formulario").style.display = "none";

  // 🧹 limpiar
  document.getElementById("nombre").value = "";
  document.getElementById("telefono").value = "";

  // 🔥 quitar bloqueos visuales después de reservar
  document.querySelectorAll(".bloqueado").forEach(el => {
    el.classList.remove("bloqueado");
    el.style.pointerEvents = "auto";
  });

  bloqueando = false;
}

// 📊 BARRA
function actualizarBarra(totalVendidos) {
  let total = document.querySelectorAll(".numero").length;
  let porcentaje = Math.round((totalVendidos / total) * 100);

  document.getElementById("barra").style.width = porcentaje + "%";
  document.getElementById("texto-barra").innerText =
    `${porcentaje}% vendido (${totalVendidos}/${total})`;
}

// 🔴 TIEMPO REAL (PRO)
function activarTiempoReal() {

  if (unsubscribe) unsubscribe();

  unsubscribe = db.collection("rifa").onSnapshot(snapshot => {

    let totalVendidos = snapshot.size;

    document.querySelectorAll(".numero").forEach(div => {
      div.classList.remove("ocupado", "pagado");
    });

    snapshot.forEach(doc => {
      let d = doc.data();
      let num = doc.id;

      document.querySelectorAll(".numero").forEach(div => {

        let texto = div.innerText;

        if (
          texto === num ||
          texto.startsWith(num + " -") ||
          texto.endsWith("- " + num) ||
          texto.includes(" " + num + " ")
        ) {
          div.classList.add("ocupado");

          if (d.pagado === true) {
            div.classList.add("pagado");
          }
        }

      });
    });

    actualizarBarra(totalVendidos);

    if (ES_ADMIN) {
      cargarPanelAdmin();
    }

  });
}

// =========================
// 🔐 ADMIN (TODO IGUAL)
// =========================

function activarAdmin() {
  let clave = prompt("Clave admin:");

  if (clave === CLAVE_ADMIN) {
    ES_ADMIN = true;
    document.getElementById("panelAdmin").style.display = "block";
    cargarPanelAdmin();
  } else {
    alert("Clave incorrecta");
  }
}

async function cambiarTalonario() {
  let tipo = document.getElementById("tipoTalonario").value;

  TIPO_TALONARIO = tipo;

  await db.collection("config").doc("talonario").set({
    tipo: tipo
  });

  generarGrid();
  activarTiempoReal();

  alert("✅ Talonario cambiado");
}

async function cargarPanelAdmin() {
  let configDoc = await db.collection("config").doc("datos").get();

  if (configDoc.exists) {
    CONFIG = configDoc.data();
  }

  document.getElementById("editorNequi").value = CONFIG.nequi;
  document.getElementById("editorWhats").value = CONFIG.whatsapp;

  let lista = document.getElementById("listaCompradores");
  lista.innerHTML = "";

  let snapshot = await db.collection("rifa").get();

  snapshot.forEach(doc => {
    let d = doc.data();

    let estadoPagado = d.pagado ? "💰 PAGADO" : "⏳ PENDIENTE";

    lista.innerHTML += `
      <div style="border:1px solid #555; padding:10px; margin:5px;">
        🔢 ${d.numero} | 👤 ${d.nombre} | 📞 ${d.telefono}
        <br>
        <strong>${estadoPagado}</strong>
        <br><br>
        <button onclick="marcarPagado('${d.numero}')">✅ Confirmar pagado</button>
        <button onclick="liberarNumero('${d.numero}')">❌ Liberar</button>
      </div>
    `;
  });
}

async function marcarPagado(num) {
  let ok = confirm("¿Confirmar pago del número " + num + "?");
  if (!ok) return;

  await db.collection("rifa").doc(num).update({
    pagado: true
  });

  alert("✅ Marcado como pagado");
}

async function liberarNumero(num) {
  let ok = confirm("¿Liberar número " + num + "?");
  if (!ok) return;

  await db.collection("rifa").doc(num).delete();

  alert("Número liberado");
}

async function guardarConfig() {
  let nequi = document.getElementById("editorNequi").value;
  let whatsapp = document.getElementById("editorWhats").value;

  await db.collection("config").doc("datos").set({ nequi, whatsapp });

  alert("✅ Config guardada");
}

async function buscarGanador() {
  let numero = prompt("Número ganador:");
  let doc = await db.collection("rifa").doc(numero).get();

  if (doc.exists) {
    let d = doc.data();
    alert(`🏆 Ganador:\n${d.nombre}\nTel: ${d.telefono}`);
  } else {
    alert("No fue vendido");
  }
}

async function reiniciarRifa() {
  let confirmar = confirm("⚠️ Esto borrará TODA la rifa. ¿Seguro?");
  if (!confirmar) return;

  let snapshot = await db.collection("rifa").get();
  let batch = db.batch();

  snapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  await db.collection("config").doc("combos").delete();

  alert("🔥 Rifa reiniciada");
}

async function guardarTexto() {
  let texto = document.getElementById("editorTexto").value;

  await db.collection("config").doc("texto").set({ html: texto });

  document.getElementById("info-sorteo").innerHTML = texto;

  alert("Texto guardado");
}

async function cargarTexto() {
  let doc = await db.collection("config").doc("texto").get();

  if (doc.exists) {
    document.getElementById("info-sorteo").innerHTML = doc.data().html;
  }
}

function copiarNequi() {
  navigator.clipboard.writeText(CONFIG.nequi);
  alert("Nequi copiado: " + CONFIG.nequi);
}

function enviarComprobante() {
  let url = `https://wa.me/57${CONFIG.whatsapp}?text=Hola envío comprobante`;
  window.open(url, "_blank");
}

// 🚀 INICIO
async function iniciar() {
  let doc = await db.collection("config").doc("datos").get();

  if (doc.exists) {
    CONFIG = doc.data();
  }

  let talonarioDoc = await db.collection("config").doc("talonario").get();
  if (talonarioDoc.exists) {
    TIPO_TALONARIO = talonarioDoc.data().tipo;
  }

  generarGrid();
  await cargarTexto();
  activarTiempoReal();
}

iniciar();
// 🔥 TOAST PRO
function mostrarToast(mensaje) {
  const toast = document.getElementById("toast");
  toast.textContent = mensaje;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// 🔥 WHATSAPP PRO
function enviarWhatsApp(nombre, numeros, telefonoUsuario) {

  let telefono = CONFIG.whatsapp;

  let mensaje = `Hola, soy ${nombre}.
Reservé los números: ${numeros}.
Mi teléfono es: ${telefonoUsuario}.
Quedo atento para el pago.`;

  let url = `https://api.whatsapp.com/send?phone=57${telefono}&text=${encodeURIComponent(mensaje)}`;

  // 🔥 confirmación visual PRO
  mostrarToast("✅ Reserva hecha, abriendo WhatsApp...");

  setTimeout(() => {
    window.open(url, "_blank");
  }, 1200);
}
