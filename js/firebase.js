let seleccionados = new Set();
let adminActivo = false;

// 🔐 ADMIN
function activarAdmin() {
  let clave = prompt("Clave admin");
  if (clave === "316523") {
    adminActivo = true;
    document.getElementById("panelAdmin").style.display = "block";
    cargarCompradores();
  }
}

// 🎯 GRID
function crearGrid() {
  let grid = document.getElementById("grid");
  grid.innerHTML = "";

  for (let i = 0; i < 100; i++) {
    let num = i.toString().padStart(2, "0");

    let div = document.createElement("div");
    div.className = "numero";
    div.id = "n" + num;
    div.innerText = num;

    div.onclick = () => seleccionarNumero(num);

    grid.appendChild(div);
  }
}

crearGrid();

// 🎯 SELECCIÓN
function seleccionarNumero(num) {
  let el = document.getElementById("n" + num);

  if (el.classList.contains("pagado") || el.classList.contains("reservado")) return;

  if (seleccionados.has(num)) {
    seleccionados.delete(num);
    el.classList.remove("seleccionado");
  } else {
    seleccionados.add(num);
    el.classList.add("seleccionado");
  }
}

// 📋 FORMULARIO
function mostrarFormulario() {
  document.getElementById("formulario").style.display = "block";
}

// 💾 RESERVA
function confirmarReserva() {
  let nombre = document.getElementById("nombre").value;
  let telefono = document.getElementById("telefono").value;

  if (!nombre || !telefono || seleccionados.size === 0) {
    alert("Completa todo");
    return;
  }

  db.collection("rifa").add({
    nombre,
    telefono,
    numeros: Array.from(seleccionados),
    estado: "reservado"
  });

  enviarWhatsApp(nombre);

  alert("Reserva enviada");
  location.reload();
}

// 📲 WHATSAPP
function enviarWhatsApp(nombre) {
  let nums = Array.from(seleccionados).join(", ");
  let mensaje = `Hola soy ${nombre}, elegí: ${nums}`;

  window.open(`https://wa.me/573003704654?text=${encodeURIComponent(mensaje)}`);
}

// 💰 APROBAR
function aprobarPago() {
  let num = document.getElementById("numeroAprobar").value;

  db.collection("rifa")
    .where("numeros", "array-contains", num)
    .get()
    .then(snap => {
      snap.forEach(doc => doc.ref.update({ estado: "pagado" }));
    });

  alert("Aprobado");
}

// 🔄 TIEMPO REAL
db.collection("rifa").onSnapshot(snap => {
  let vendidos = 0;

  snap.forEach(doc => {
    let data = doc.data();

    data.numeros.forEach(n => {
      let el = document.getElementById("n" + n);

      el.classList.remove("seleccionado", "reservado", "pagado");

      if (data.estado === "pagado") {
        el.classList.add("pagado");
        vendidos++;
      } else {
        el.classList.add("reservado");
      }
    });
  });

  document.getElementById("contador").innerText = "Vendidos: " + vendidos;
});

// 👥 VER CLIENTES
function cargarCompradores() {
  db.collection("rifa").get().then(snap => {
    let html = "";
    snap.forEach(doc => {
      let d = doc.data();
      html += `<p>${d.nombre} - ${d.numeros.join(",")} (${d.estado})</p>`;
    });
    document.getElementById("listaCompradores").innerHTML = html;
  });
}

// 🏆 GANADOR
function buscarGanador() {
  let g = Math.floor(Math.random()*100).toString().padStart(2,"0");
  alert("GANADOR: " + g);
}

// 🔥 REINICIAR
function reiniciarRifa() {
  if (!adminActivo) return;

  db.collection("rifa").get().then(snap => {
    snap.forEach(doc => doc.ref.delete());
  });

  alert("Reiniciado");
  location.reload();
}

// 📋 NEQUI
function copiarNequi() {
  navigator.clipboard.writeText("573003704654");
  alert("Copiado");
}

// 📲 COMPROBANTE
function enviarComprobante() {
  window.open("https://wa.me/573003704654");
}