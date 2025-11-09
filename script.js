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

const sensores = {
  // Temperatura - Circular
  temp: new Chart(document.getElementById("chartTemp"), {
    type: "doughnut",
    data: {
      labels: ["Temperatura", "Resto"],
      datasets: [
        {
          data: [0, 100],
          backgroundColor: ["#ff5733", "#eee"],
          borderWidth: 0,
          cutout: "70%",
        },
      ],
    },
    options: {
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false },
      },
    },
  }),

  // Humedad Aire - Barras
  hum: new Chart(document.getElementById("chartHum"), {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Humedad Aire (%)",
          backgroundColor: "#33c1ff",
          borderRadius: 6,
          data: [],
        },
      ],
    },
    options: {
      animation: true,
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  }),

  // Humedad Suelo - Línea Suave
  humSuelo: new Chart(document.getElementById("chartHumSuelo"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Humedad Suelo (%)",
          borderColor: "#33ff77",
          backgroundColor: "rgba(51, 255, 119, 0.2)",
          fill: true,
          tension: 0.4,
          data: [],
        },
      ],
    },
    options: {
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  }),

  // Luz - Indicador tipo gauge
  luz: new Chart(document.getElementById("chartLuz"), {
    type: "doughnut",
    data: {
      labels: ["Luz (LDR)", "Resto"],
      datasets: [
        {
          data: [0, 100],
          backgroundColor: ["#ffb833", "#eee"],
          borderWidth: 0,
          cutout: "70%",
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
  }),

  // Nivel de Agua - Gauge simulado (doughnut parcial)
  nivel: new Chart(document.getElementById("chartNivel"), {
    type: "doughnut",
    data: {
      labels: ["Nivel Agua", "Resto"],
      datasets: [
        {
          data: [0, 100],
          backgroundColor: ["#5d33ff", "#eee"],
          borderWidth: 0,
          rotation: -90,
          circumference: 180,
          cutout: "70%",
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
  }),
};

function actualizarGrafico(chart, valor) {
  if (chart.config.type === "doughnut") {
    // Para temperatura o nivel (gauge)
    const max = 100;
    chart.data.datasets[0].data = [valor ?? 0, max - (valor ?? 0)];
  } else if (chart.config.type === "radar") {
    // Para luz (simulamos variación)
    chart.data.datasets[0].data = Array(5)
      .fill(0)
      .map(() => (valor ?? 0) + Math.random() * 10 - 5);
  } else {
    // Para los demás (líneas, barras)
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

function enviarComando(comando) {
  if (client.connected) {
    client.publish(topicComandos, comando);
    console.log("➡️ Enviado:", comando);
  } else {
    console.warn("⚠️ No conectado aún.");
  }
}

client.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
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
  } catch (e) {
    console.error("❌ Error procesando datos:", e);
  }
});
