document.addEventListener('DOMContentLoaded', () => {
    const jsonFile = document.getElementById('jsonFile');
    const statusMessage = document.getElementById('statusMessage');
    const jsonOutput = document.getElementById('jsonOutput');

    jsonFile.addEventListener('change', handleFile, false);

    /**
     * Muestra un mensaje de estado, cambiando su color si es un error.
     * @param {string} message - El mensaje a mostrar.
     * @param {boolean} isError - Si es un mensaje de error.
     */
    function updateStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.style.color = isError ? 'red' : '#28a745';
    }

    /**
     * Maneja la selección del archivo y su lectura.
     * @param {Event} event - El evento de cambio del input de archivo.
     */
    function handleFile(event) {
        updateStatus('Procesando archivo...');
        jsonOutput.textContent = 'Cargando...';

        const file = event.target.files[0];
        if (!file) {
            updateStatus('Ningún archivo seleccionado.', true);
            jsonOutput.textContent = 'Esperando un archivo...';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const rawContent = e.target.result;
            let jsonContent;

            try {
                // 1. Parsear el contenido JSON
                jsonContent = JSON.parse(rawContent);
                // Mostrar el JSON formateado para la vista previa
                jsonOutput.textContent = JSON.stringify(jsonContent, null, 2);

                // 2. Transformar los datos
                // MODIFICADO: Recibir los 4 conjuntos de datos
                const { parentData, ticketItemsData, attendeesData, extraFieldsData } = transformJson(jsonContent);

                // 3. Generar y descargar el XLSX
                // MODIFICADO: Pasar los 4 conjuntos de datos
                exportToXLSX(parentData, ticketItemsData, attendeesData, extraFieldsData);

                updateStatus(`¡Archivo XLSX generado exitosamente!`);

            } catch (error) {
                console.error("Error al procesar el archivo:", error);
                // Si falla el parseo o la transformación, muestra el contenido sin formato
                jsonOutput.textContent = rawContent; 
                updateStatus(`Error: ${error.message}. Asegúrate de que el formato es un array de órdenes válido.`, true);
            }
        };
        reader.readAsText(file);
    }

    /**
     * Transforma el JSON original en CUATRO conjuntos de datos planos.
     * @param {Array<Object>} jsonArray - El array de objetos de la orden/compra.
     * @returns {Object} Un objeto con los datos para cada hoja.
     */
    function transformJson(jsonArray) {
        const ticketItemsData = [];
        const attendeesData = [];
        const extraFieldsData = []; // <-- 1. NUEVO ARRAY AÑADIDO

        // 1. Recorrer las órdenes para generar los datos de ítems y asistentes
        jsonArray.forEach(order => {
            const { id: order_id, date_time: order_date_time, ticket_items, attendees, ...parent } = order;

            // Procesar Items del Ticket
            if (Array.isArray(ticket_items)) {
                ticket_items.forEach(item => {
                    ticketItemsData.push({
                        order_id,
                        order_date_time,
                        ...item
                    });
                });
            }

            // Procesar Asistentes
            if (Array.isArray(attendees)) {
                attendees.forEach(attendee => {
                    // Creamos una copia del asistente
                    let attendeeData = { ...attendee };

                    // --- 2. NUEVA LÓGICA PARA LA HOJA "ExtraFields" ---
                    // Si existe el objeto extra_fields y no está vacío
                    if (attendeeData.extra_fields && typeof attendeeData.extra_fields === 'object' && Object.keys(attendeeData.extra_fields).length > 0) {
                        
                        // Añadimos la data a la nueva hoja
                        extraFieldsData.push({
                            order_id, // El ID del padre (orden)
                            // Opcional: añadir el ID del asistente si existe (ej: attendee_id: attendee.id)
                            ...attendeeData.extra_fields // Aplanamos los campos extra
                        });
                    }
                    // --- FIN NUEVA LÓGICA ---

                    // (Lógica existente para aplanar en la hoja "Asistentes" - se mantiene)
                    if (attendeeData.extra_fields && typeof attendeeData.extra_fields === 'object') {
                        // Aplanamos las propiedades de extra_fields e las incorporamos al objeto principal
                        attendeeData = {
                            ...attendeeData,
                            ...attendeeData.extra_fields // Esto añade 'casita_de_luz', etc., como propiedades de nivel superior
                        };
                        // Eliminamos la clave extra_fields ya que sus contenidos están ahora a nivel superior
                        delete attendeeData.extra_fields;
                    }

                    // Añadimos las claves de la orden padre y el asistente aplanado
                    attendeesData.push({
                        order_id,
                        order_date_time,
                        ...attendeeData
                    });
                });
            }
        });

        // 2. Crear los datos 'Padre' eliminando los arrays anidados.
        const parentData = jsonArray.map(({ ticket_items, attendees, ...rest }) => rest);

        // 3. MODIFICADO: Devolver los 4 conjuntos de datos
        return { parentData, ticketItemsData, attendeesData, extraFieldsData };
    }

    /**
     * Genera el archivo XLSX con las CUATRO hojas de datos.
     */
    // 4. MODIFICADO: Aceptar el nuevo argumento 'extraFieldsData'
    function exportToXLSX(parentData, ticketItemsData, attendeesData, extraFieldsData) {
        const workbook = XLSX.utils.book_new();

        // Función auxiliar para añadir hojas
        const addSheet = (data, sheetName) => {
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, ws, sheetName);
        };

        // Añadir las tres hojas
        addSheet(parentData, "Ordenes_Padre");
        addSheet(ticketItemsData, "Items_Ticket");
        addSheet(attendeesData, "Asistentes");
        addSheet(extraFieldsData, "ExtraFields"); // <-- 5. NUEVA HOJA AÑADIDA

        // Escribir el archivo y descargarlo
        XLSX.writeFile(workbook, "Datos_Exportados.xlsx");
    }
});
