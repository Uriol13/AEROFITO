const broker = "wss://18fb7bbbdae64144894d744ef6032fd6.s1.eu.hivemq.cloud:8884/mqtt";
const options = {
  username: "AliUr",
  password: "Kira#Cr7",
  clean: true,
  reconnectPeriod: 4000,
  connectTimeout: 5000
};

const topicDatos = "aeroponia/datos";
const topicComandos = "aeroponia/comandos";

const client = mqtt.connect(broker, options);

client.on("connect", () => {
  console.log("✅ Conectado a HiveMQ WebSocket");
  client.subscribe(topicDatos);
});

client.on("error", (err) => console.error("❌ Error MQTT:", err));

const el = (id) => document.getElementById(id);

// ===============================
//   CONFIGURACIÓN DE GRÁFICOS
// ===============================
const sensores = {
  temp: new Chart(document.getElementById("chartTemp"), {
    type: "doughnut",
    data: { labels: ["Temperatura", "Resto"], datasets: [{ data: [0, 100], backgroundColor: ["#ff5733", "#eee"], borderWidth: 0, cutout: "70%" }] },
    options: { plugins: { tooltip: { enabled: false }, legend: { display: false } } },
  }),
  hum: new Chart(document.getElementById("chartHum"), {
    type: "bar",
    data: { labels: [], datasets: [{ label: "Humedad Aire (%)", backgroundColor: "#33c1ff", borderRadius: 6, data: [] }] },
    options: { animation: true, scales: { y: { beginAtZero: true, max: 100 } } },
  }),
  humSuelo: new Chart(document.getElementById("chartHumSuelo"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Humedad Suelo (%)", borderColor: "#33ff77", backgroundColor: "rgba(51, 255, 119, 0.2)", fill: true, tension: 0.4, data: [] }] },
    options: { scales: { y: { beginAtZero: true, max: 100 } } },
  }),
  luz: new Chart(document.getElementById("chartLuz"), {
    type: "doughnut",
    data: { labels: ["Luz (LDR)", "Resto"], datasets: [{ data: [0, 100], backgroundColor: ["#ffb833", "#eee"], borderWidth: 0, cutout: "70%" }] },
    options: { plugins: { legend: { display: false }, tooltip: { enabled: false } } },
  }),
  nivel: new Chart(document.getElementById("chartNivel"), {
    type: "doughnut",
    data: { labels: ["Nivel Agua", "Resto"], datasets: [{ data: [0, 100], backgroundColor: ["#5d33ff", "#eee"], borderWidth: 0, rotation: -90, circumference: 180, cutout: "70%" }] },
    options: { plugins: { legend: { display: false }, tooltip: { enabled: false } } },
  }),
};

// ===============================
//   ACTUALIZACIÓN DE GRÁFICOS
// ===============================
function actualizarGrafico(chart, valor) {
  if (chart.config.type === "doughnut") {
    const esLuz = chart.canvas.id === "chartLuz";
    const max = esLuz ? 1023 : 100;
    const porcentaje = Math.min((valor ?? 0) / max * 100, 100);
    let colorPrincipal = "#ffb833";
    if (esLuz) {
      const intensidad = Math.floor((porcentaje / 100) * 255);
      colorPrincipal = `rgb(255, ${180 + intensidad / 2}, ${50 + intensidad / 4})`;
    }
    chart.data.datasets[0].data = [porcentaje, 100 - porcentaje];
    chart.data.datasets[0].backgroundColor = [colorPrincipal, "#eee"];
  } else {
    const hora = new Date().toLocaleTimeString();
    chart.data.labels.push(hora);
    chart.data.datasets[0].data.push(valor ?? 0);
    if (chart.data.labels.length > 15) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
  }
  chart.update();
}

// ===============================
//   ENVÍO DE COMANDOS
// ===============================
function enviarComando(comando) {
  if (client.connected) {
    client.publish(topicComandos, comando);
    console.log("➡️ Enviado:", comando);
  } else {
    console.warn("⚠️ No conectado aún.");
  }
}

function activarBoton(boton, grupoId) {
  const grupo = document.getElementById(grupoId);
  const botones = grupo.querySelectorAll("button");
  botones.forEach(b => b.classList.remove("active"));
  boton.classList.add("active");
}

// ===============================
//   RECEPCIÓN DE DATOS MQTT
// ===============================
client.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    data.humSuelo = Math.min((data.humSuelo / 1023) * 100, 100);
    el("temp").innerText = data.temp ?? "--";
    el("hum").innerText = data.hum ?? "--";
    el("humSuelo").innerText = data.humSuelo ?? "--";
    el("luz").innerText = data.luz ?? "--";
    el("nivel").innerText = data.nivelAgua ?? "--";
    el("modo").innerText = data.modo ?? "--";

    actualizarGrafico(sensores.temp, data.temp);
    actualizarGrafico(sensores.hum, data.hum);
    actualizarGrafico(sensores.humSuelo, data.humSuelo);
    actualizarGrafico(sensores.luz, data.luz);
    actualizarGrafico(sensores.nivel, data.nivelAgua);

    // ⚙️ Verifica si el modo es AUTO o MANUAL
    if (data.modo?.toUpperCase() === "AUTO") {
      desactivarBotonesActuadores(true);
      marcarModoActivo("AUTO");
    } else if (data.modo?.toUpperCase() === "MANUAL") {
      desactivarBotonesActuadores(false);
      marcarModoActivo("MANUAL");
    }

  } catch (e) {
    console.error("❌ Error procesando datos:", e);
  }
});

// ===============================
//   BLOQUEO / DESBLOQUEO DE BOTONES
// ===============================
function desactivarBotonesActuadores(bloquear) {
  const grupos = ["grupoLed", "grupoHumi", "grupoBuzzer1", "grupoBuzzer2"];
  grupos.forEach(id => {
    const grupo = document.getElementById(id);
    const botones = grupo.querySelectorAll("button");
    botones.forEach(b => {
      b.disabled = bloquear;
      b.style.opacity = bloquear ? "0.5" : "1";
      b.style.cursor = bloquear ? "not-allowed" : "pointer";
    });
  });
}

// ===============================
//   MODO ACTUAL VISUAL
// ===============================
function marcarModoActivo(modo) {
  const grupoModo = document.getElementById("grupoModo");
  const botones = grupoModo.querySelectorAll("button");
  botones.forEach(b => b.classList.remove("active"));
  if (modo === "AUTO") botones[0].classList.add("active");
  else if (modo === "MANUAL") botones[1].classList.add("active");
}
