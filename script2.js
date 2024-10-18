
document.getElementById('uploadButton').addEventListener('click', uploadFiles);

let totalSize = 0;

// Load existing files from Local Storage when the page loads
window.onload = function() {
    const savedFiles = JSON.parse(localStorage.getItem('files')) || [];
    totalSize = 0;
    savedFiles.forEach(file => {
        addFileToList(file.name, file.size, file.content, file.isImage, file.type);
        totalSize += file.size;
    });
    updateTotalSize();
};

// Function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function uploadFiles() {
    const fileInput = document.getElementById('fileInput');
    Array.from(fileInput.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const isImage = file.type.startsWith('image/');
            const savedFiles = JSON.parse(localStorage.getItem('files')) || [];
            let base64Content = '';

            if (file.type === 'application/pdf') {
                base64Content = arrayBufferToBase64(content);
                savedFiles.push({ name: file.name, size: file.size, content: base64Content, isImage: false, type: file.type });
            } else {
                savedFiles.push({ name: file.name, size: file.size, content: content, isImage: isImage, type: file.type });
            }

            localStorage.setItem('files', JSON.stringify(savedFiles));
            addFileToList(file.name, file.size, isImage ? content : (file.type === 'application/pdf' ? base64Content : content), isImage, file.type);
            totalSize += file.size;
            updateTotalSize();
        };

        // Determine how to read the file based on its type
        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            reader.readAsArrayBuffer(file);
        } else if (file.type === 'text/csv' || file.type === 'application/vnd.ms-excel' || file.type === 'text/plain') {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file); // For binary files or unknown types
        }
    });
    fileInput.value = '';
}

function addFileToList(name, size, content, isImage, type) {
    const fileList = document.getElementById('fileList');
    const li = document.createElement('li');
    
    const fileLink = document.createElement('a');
    fileLink.innerText = `${name} - ${Math.round(size / 1024)} KB`;
    fileLink.href = '#';
    fileLink.onclick = (event) => {
        event.preventDefault();
        viewFile(content, isImage, type, name);
    };
    li.appendChild(fileLink);

    const removeButton = document.createElement('button');
    removeButton.innerText = 'Remove';
    removeButton.onclick = (event) => {
        event.stopPropagation();
        removeFile(name, size, li);
    };
    li.appendChild(removeButton);
    fileList.appendChild(li);
}

function viewFile(content, isImage, type, name) {
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
        alert('Please allow popups for this website to view file contents.');
        return;
    }

    newWindow.document.write(`
        <html>
            <head>
                <title>File Content</title>
                <style>
                    body { font-family: 'Arial', sans-serif; margin: 20px; background-color: #f9f9f9; color: #333; }
                    img { max-width: 100%; height: auto; }
                    pre { white-space: pre-wrap; word-wrap: break-word; background-color: #fff; border: 1px solid #ccc; padding: 10px; border-radius: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                    th { background-color: #007bff; color: white; }
                </style>
            </head>
 <body>
                <h2>File Content</h2>
                ${isImage ? `<img src="${content}" alt="Image Preview">` : 
                type === 'application/pdf' ? 
                `<iframe id="pdfFrame" src="" width="100%" height="600px"></iframe>` : 
                type === 'text/csv' || type === 'application/vnd.ms-excel' ? 
                `<div id="csvContent"></div>` : 
                `<pre>${content}</pre>`}
                ${!isImage && type !== 'application/pdf' && type !== 'text/csv' ? 
                `<a href="${content}" download="${name}">Download ${name}</a>` : ''}
            </body>
        </html>
    `);

    // Display PDF
    if (type === 'application/pdf') {
        const byteCharacters = atob(content); // Convert Base64 to binary string
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobURL = URL.createObjectURL(blob);
        newWindow.document.getElementById('pdfFrame').src = blobURL;
    }

    // Display CSV content in a table
    if (type === 'text/csv' || type === 'application/vnd.ms-excel') {
        const rows = content.split('\n').map(row => row.split(','));
        const tableHTML = `
            <table>
                <thead>
                    <tr>${rows[0].map(header => `<th>${header}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.slice(1).map(row => `
                        <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        newWindow.document.getElementById('csvContent').innerHTML = tableHTML;
    }

    newWindow.document.close();
}

function removeFile(name, size, li) {
    li.remove();
    let savedFiles = JSON.parse(localStorage.getItem('files')) || [];
    savedFiles = savedFiles.filter(file => file.name !== name);
    localStorage.setItem('files', JSON.stringify(savedFiles));
    totalSize -= size;
    updateTotalSize();
}

function updateTotalSize() {
    document.getElementById('totalSize').innerText = `Total Size: ${Math.round(totalSize / 1024)} KB`;
}