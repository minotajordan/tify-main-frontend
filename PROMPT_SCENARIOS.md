
# Escenarios de Simulación y Prueba (WebLLM)

Este documento detalla los escenarios de prueba diseñados para validar la capacidad del "Tify Neural Core" (WebLLM) de interpretar solicitudes indirectas y generar formularios complejos.

## Escenario 1: Solicitud Específica (El ejemplo del usuario)
**Prompt:**
> "Creame un formulario para obtener informacion basica de las personas, nombres completos en un solo campo, pregunta si es mujer o hombre y el municipio, telefono cedula y el abeas data"

**Resultado Esperado:**
- **Título:** Registro de Información Básica (o similar).
- **Campos:**
    1. Nombre Completo (`text`) - *Clave: "en un solo campo"*
    2. Género (`select`) - *Clave: "mujer o hombre"*
    3. Municipio (`text`)
    4. Teléfono (`number`)
    5. Cédula / Documento (`number`) - *Clave: "cedula"*
    6. Autorización Datos (`habeasData`) - *Clave: "abeas data"*

## Escenario 2: Solicitud Indirecta / Basada en Necesidad (Recursos Humanos)
**Prompt:**
> "Necesito recolectar hojas de vida para un puesto de desarrollador, que pongan su linkedin"

**Resultado Esperado:**
- **Título:** Postulación: Desarrollador
- **Campos Inferidos:**
    1. Nombre Completo
    2. Email (Esencial para contacto)
    3. Perfil de LinkedIn (`text`) - *Solicitado explícitamente*
    4. Adjuntar CV (`file`) - *Inferido de "hojas de vida"*

## Escenario 3: Encuesta de Opinión (Feedback)
**Prompt:**
> "Encuesta rápida para saber si les gustó la comida del evento"

**Resultado Esperado:**
- **Título:** Encuesta de Satisfacción
- **Campos:**
    1. Nombre (Probablemente opcional)
    2. Calificación Comida (`select` o `rating`) - *Inferido de "si les gustó"*
    3. Comentarios (`textarea`)

## Escenario 4: Registro a Torneo (Gaming)
**Prompt:**
> "Quiero inscribir gente al torneo de FIFA, necesito su gamertag y consola"

**Resultado Esperado:**
- **Título:** Inscripción Torneo FIFA
- **Campos:**
    1. Nombre Completo
    2. Email
    3. Gamertag (`text`)
    4. Consola (`select`: PS5, Xbox, PC...)

## Escenario 5: Solicitud Vaga / Genérica
**Prompt:**
> "Formulario de contacto"

**Resultado Esperado:**
- **Campos Estándar:** Nombre, Email, Mensaje.

---

## Estrategia de Implementación
El `systemPrompt` en `webLlmService.ts` ha sido actualizado con **Few-Shot Learning** (aprendizaje con pocos ejemplos). Se han incluido estos ejemplos directamente en las instrucciones del modelo para "enseñarle" cómo mapear estas solicitudes informales a la estructura JSON estricta requerida por la aplicación.
