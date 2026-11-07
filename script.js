// TIENDA REVUP
// Para que funcione hay que abrirla con Live Server (VS Code), porque
// si abro el html con doble clic el navegador no deja leer los JSON con fetch.

// ---------- VARIABLES ----------
let productos = [];          // aquí guardo los productos de productos.json
let usuario = null;          // aquí guardo los datos de userData.json
let cesta = [];              // la cesta: cada elemento es {id: 1, cantidad: 2}
let categoriaActiva = "Todo";

// ---------- ELEMENTOS DEL HTML ----------
const catalogo = document.getElementById("catalogo");
const filtros = document.getElementById("filtros");
const buscador = document.getElementById("buscador");
const orden = document.getElementById("orden");
const contador = document.getElementById("contador-cesta");
const modal = document.getElementById("modal");
const envio = document.getElementById("envio");
const listaCesta = document.getElementById("lista-cesta");
const total = document.getElementById("total");
const toast = document.getElementById("toast");

// ---------- CARGAR LOS JSON ----------
async function cargarDatos() {
    try {
        const respProductos = await fetch("productos.json");
        productos = await respProductos.json();

        const respUsuario = await fetch("userData.json");
        usuario = await respUsuario.json();

        crearFiltros();
        mostrarProductos();
        actualizarContador();
    } catch (error) {
        console.log(error);
        catalogo.innerHTML = "<p>No se han podido cargar los productos.</p>";
    }
}

// ---------- FILTROS POR CATEGORÍA ----------
function crearFiltros() {
    // Saco las categorías de los productos sin repetirlas (con Set)
    const categorias = ["Todo", ...new Set(productos.map(p => p.category))];

    filtros.innerHTML = "";
    categorias.forEach(cat => {
        const boton = document.createElement("button");
        boton.textContent = cat;
        boton.className = "filtro";
        if (cat === categoriaActiva) {
            boton.classList.add("activo");
        }
        // Al pulsar cambio la categoría y vuelvo a pintar todo
        boton.addEventListener("click", () => {
            categoriaActiva = cat;
            crearFiltros();
            mostrarProductos();
        });
        filtros.appendChild(boton);
    });
}

// ---------- MOSTRAR LOS PRODUCTOS ----------
function mostrarProductos() {
    // 1. Filtro por categoría
    let lista = productos.filter(p => categoriaActiva === "Todo" || p.category === categoriaActiva);

    // 2. Filtro por lo que se ha escrito en el buscador
    const texto = buscador.value.toLowerCase();
    lista = lista.filter(p => p.name.toLowerCase().includes(texto) || p.description.toLowerCase().includes(texto));

    // 3. Ordenar según lo que haya elegido en el select
    if (orden.value === "precio-asc") {
        lista.sort((a, b) => a.price - b.price);
    } else if (orden.value === "precio-desc") {
        lista.sort((a, b) => b.price - a.price);
    } else if (orden.value === "nombre") {
        lista.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 4. Pintar las tarjetas
    if (lista.length === 0) {
        catalogo.innerHTML = "<p>No hay productos con esa búsqueda.</p>";
        return;
    }

    catalogo.innerHTML = "";
    lista.forEach(p => {
        catalogo.innerHTML += `
            <article class="tarjeta">
                <span class="tarjeta_cat">${p.category}</span>
                <h3 class="tarjeta_nombre">${p.name}</h3>
                <p class="tarjeta_desc">${p.description}</p>
                <span class="tarjeta_precio">${p.price.toFixed(2)}€</span>
                <button class="boton_principal" onclick="anadirACesta(${p.id})">Añadir a la cesta</button>
            </article>`;
    });
}

// ---------- CESTA ----------
function anadirACesta(id) {
    // Miro si el producto ya estaba en la cesta
    const existente = cesta.find(item => item.id === id);
    if (existente) {
        existente.cantidad++;       // si ya estaba, sumo uno
    } else {
        cesta.push({ id: id, cantidad: 1 });   // si no, lo añado nuevo
    }

    const producto = productos.find(p => p.id === id);
    mostrarToast(producto.name + " añadido a la cesta");
    actualizarContador();
}

function sumar(id) {
    cesta.find(item => item.id === id).cantidad++;
    actualizarContador();
    mostrarCesta();
}

function restar(id) {
    const item = cesta.find(item => item.id === id);
    item.cantidad--;
    // Si llega a 0 lo quito de la cesta
    if (item.cantidad === 0) {
        eliminar(id);
        return;
    }
    actualizarContador();
    mostrarCesta();
}

function eliminar(id) {
    // filter me deja todos menos el que quiero borrar
    cesta = cesta.filter(item => item.id !== id);
    actualizarContador();
    mostrarCesta();
}

// Suma todas las cantidades y las pone en la burbuja del botón
function actualizarContador() {
    let cantidadTotal = 0;
    cesta.forEach(item => {
        cantidadTotal += item.cantidad;
    });
    contador.textContent = cantidadTotal;
}

// ---------- MODAL ----------
function abrirCesta() {
    mostrarCesta();
    modal.hidden = false;
}

function cerrarCesta() {
    modal.hidden = true;
}

function mostrarCesta() {
    // Mensaje de envío con los datos del usuario
    envio.textContent = "Enviando pedido a: " + usuario.name + ", " + usuario.address;

    if (cesta.length === 0) {
        listaCesta.innerHTML = "<li>Tu cesta está vacía.</li>";
        total.textContent = "0,00€";
        return;
    }

    listaCesta.innerHTML = "";
    let suma = 0;
    cesta.forEach(item => {
        const p = productos.find(prod => prod.id === item.id);
        const subtotal = p.price * item.cantidad;
        suma += subtotal;

        listaCesta.innerHTML += `
            <li class="linea">
                <div>
                    <div class="linea_nombre">${p.name}</div>
                    <div class="linea_precio">${p.price.toFixed(2)}€ / ud.</div>
                </div>
                <div class="linea_cantidad">
                    <button class="boton_icono" onclick="restar(${p.id})">-</button>
                    <span>${item.cantidad}</span>
                    <button class="boton_icono" onclick="sumar(${p.id})">+</button>
                    <button class="boton_icono" onclick="eliminar(${p.id})">🗑</button>
                </div>
                <div class="linea_subtotal">${subtotal.toFixed(2)}€</div>
            </li>`;
    });

    // toFixed(2) para dos decimales y replace para poner la coma
    total.textContent = suma.toFixed(2).replace(".", ",") + "€";
}

// Botón de finalizar: no hay pago real, solo vacía la cesta
function finalizarCompra() {
    if (cesta.length === 0) {
        mostrarToast("La cesta está vacía");
        return;
    }
    cesta = [];
    actualizarContador();
    cerrarCesta();
    mostrarToast("¡Pedido realizado!");
}

// ---------- TOAST (mensaje que desaparece solo) ----------
function mostrarToast(mensaje) {
    toast.textContent = mensaje;
    toast.classList.add("visible");
    // A los 2 segundos lo quito
    setTimeout(() => {
        toast.classList.remove("visible");
    }, 2000);
}

// ---------- EVENTOS ----------
document.getElementById("ver_cesta").addEventListener("click", abrirCesta);
document.getElementById("finalizar").addEventListener("click", finalizarCompra);

// Todo lo que tenga data-cerrar (la X y el fondo oscuro) cierra el modal
document.querySelectorAll("[data-cerrar]").forEach(el => {
    el.addEventListener("click", cerrarCesta);
});

// Cada vez que escribo o cambio el orden se vuelve a pintar el catálogo
buscador.addEventListener("input", mostrarProductos);
orden.addEventListener("change", mostrarProductos);

// ---------- ARRANQUE ----------
cargarDatos();
