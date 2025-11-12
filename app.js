document.getElementById('jsonFile').addEventListener('change', handleFile, false);
const statusMessage = document.getElementById('statusMessage');

/**
 * Maneja la selección del archivo y su lectura.
 * @param {Event} event - El evento de cambio del input de archivo.
 */
function handleFile(event) {
    statusMessage.textContent = 'Procesando archivo...';
    const file = event.target.files[0];
    if (!file) {
        statusMessage.textContent = 'Ningún archivo seleccionado.';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // 1. Parsear el contenido JSON
            const jsonContent = JSON.parse(e.target.result);
            
            // 2. Transformar los datos
            const { parentData, ticketItemsData, attendeesData } = transformJson(jsonContent);

            // 3. Generar y descargar el XLSX
            exportToXLSX(parentData, ticketItemsData, attendeesData);

            statusMessage.textContent = `¡Archivo XLSX generado exitosamente!`;

        } catch (error) {
            console.error("Error al procesar el JSON:", error);
            statusMessage.textContent = `Error al procesar el archivo: ${error.message}. Asegúrate de que es un JSON válido.`;
        }
    };
    reader.readAsText(file);
}

/**
 * Transforma el JSON original en tres conjuntos de datos planos para las hojas de Excel.
 * @param {Array<Object>} jsonArray - El array de objetos de la orden/compra.
 * @returns {Object} Un objeto con los datos para cada hoja.
 */
function transformJson(jsonArray) {
    const parentData = [];     // Hoja 1: Datos Padre (Orden)
    const ticketItemsData = []; // Hoja 2: Ítems del Ticket
    const attendeesData = [];   // Hoja 3: Asistentes

    jsonArray.forEach(order => {
        // --- Hoja 1: Datos Padre (Orden) ---
        // Crear una copia plana de la orden, eliminando los arrays anidados.
        const parent = { ...order };
        delete parent.ticket_items;
        delete parent.attendees;
        parentData.push(parent);

        // --- Hoja 2: Ítems del Ticket ---
        order.ticket_items.forEach(item => {
            ticketItemsData.push({
                order_id: order.id,
                order_date_time: order.date_time,
                item_name: item.etn_ticket_name,
                item_price: item.etn_ticket_price,
                item_slug: item.etn_ticket_slug,
                item_qty: item.etn_ticket_qty
                // Puedes agregar más campos de la orden principal si es necesario
            });
        });

        // --- Hoja 3: Asistentes ---
        order.attendees.forEach(attendee => {
            attendeesData.push({
                order_id: order.id,
                order_date_time: order.date_time,
                attendee_id: attendee.id,
                name: attendee.etn_name,
                email: attendee.etn_email,
                phone: attendee.etn_phone,
                event_name: attendee.event_name,
                ticket_name: attendee.ticket_name,
                unique_ticket_id: attendee.etn_unique_ticket_id,
                status: attendee.etn_attendeee_ticket_status
                // Puedes agregar más campos del asistente o de la orden principal
            });
        });
    });

    return { parentData, ticketItemsData, attendeesData };
}

/**
 * Genera el archivo XLSX con las tres hojas de datos.
 * @param {Array<Object>} parentData - Datos de la hoja Padre.
 * @param {Array<Object>} ticketItemsData - Datos de la hoja Ítems del Ticket.
 * @param {Array<Object>} attendeesData - Datos de la hoja Asistentes.
 */
function exportToXLSX(parentData, ticketItemsData, attendeesData) {
    // 1. Crear un nuevo libro de trabajo
    const workbook = XLSX.utils.book_new();

    // 2. Crear las hojas a partir de los arrays de objetos
    
    // Hoja 1: Padre (Ordenes)
    const ws1 = XLSX.utils.json_to_sheet(parentData);
    XLSX.utils.book_append_sheet(workbook, ws1, "Ordenes_Padre");

    // Hoja 2: Ítems del Ticket
    const ws2 = XLSX.utils.json_to_sheet(ticketItemsData);
    XLSX.utils.book_append_sheet(workbook, ws2, "Items_Ticket");

    // Hoja 3: Asistentes
    const ws3 = XLSX.utils.json_to_sheet(attendeesData);
    XLSX.utils.book_append_sheet(workbook, ws3, "Asistentes");

    // 3. Escribir el archivo y descargarlo
    XLSX.writeFile(workbook, "Datos_Exportados.xlsx");
}
