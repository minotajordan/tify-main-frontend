import nlp from 'compromise';
import Fuse from 'fuse.js';

export interface GeneratedFormField {
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  helpText?: string;
  conditional?: {
    dependsOn: string;
    value: any;
  };
}

export interface GeneratedForm {
  title: string;
  description: string;
  fields: GeneratedFormField[];
  category?: string;
  submitButtonText?: string;
  successMessage?: string;
}

// ============================================================================
// EXTENDED FIELD DICTIONARY - COMPREHENSIVE COVERAGE
// ============================================================================

interface FieldDefinition {
  id: string;
  keys: string[];
  type: string;
  labelKey: string;
  defaultLabel: string;
  placeholder?: string;
  helpText?: string;
  options?: any;
  validation?: any;
  category: string;
}

const FIELD_DICTIONARY: FieldDefinition[] = [
  // ===== INFORMACIÓN PERSONAL =====
  {
    id: 'fullname',
    keys: [
      'nombre completo',
      'nombre',
      'names',
      'apellido',
      'apellidos',
      'fullname',
      'full name',
      'como te llamas',
      'tu nombre',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.fullName',
    defaultLabel: 'Nombre Completo',
    placeholder: 'Ej: Juan Pérez García',
    helpText: 'Escribe tu nombre y apellidos completos',
    category: 'personal',
  },
  {
    id: 'firstname',
    keys: ['primer nombre', 'first name', 'nombre de pila'],
    type: 'text',
    labelKey: 'forms.fieldLabel.firstName',
    defaultLabel: 'Primer Nombre',
    placeholder: 'Ej: Juan',
    category: 'personal',
  },
  {
    id: 'lastname',
    keys: ['apellido', 'last name', 'surname', 'apellido paterno'],
    type: 'text',
    labelKey: 'forms.fieldLabel.lastName',
    defaultLabel: 'Apellido',
    placeholder: 'Ej: Pérez',
    category: 'personal',
  },
  {
    id: 'email',
    keys: [
      'email',
      'correo',
      'mail',
      'correo electrónico',
      'correo electronico',
      'e-mail',
      'electronic mail',
      'tu correo',
      'tu email',
    ],
    type: 'email',
    labelKey: 'forms.fieldLabel.email',
    defaultLabel: 'Correo Electrónico',
    placeholder: 'ejemplo@correo.com',
    helpText: 'Usaremos este correo para contactarte',
    validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', message: 'Correo inválido' },
    category: 'personal',
  },
  {
    id: 'phone',
    keys: [
      'telefono',
      'teléfono',
      'celular',
      'móvil',
      'movil',
      'phone',
      'mobile',
      'whatsapp',
      'cel',
      'numero',
      'número',
      'contacto telefónico',
    ],
    type: 'tel',
    labelKey: 'forms.fieldLabel.phone',
    defaultLabel: 'Teléfono / Celular',
    placeholder: '+57 300 123 4567',
    helpText: 'Incluye código de país si es internacional',
    validation: { pattern: '^[+]?[0-9\\s()-]{7,20}$', message: 'Número de teléfono inválido' },
    category: 'personal',
  },
  {
    id: 'id_doc',
    keys: [
      'cedula',
      'cédula',
      'id',
      'dni',
      'identificación',
      'identificacion',
      'documento',
      'cc',
      'ti',
      'tarjeta identidad',
      'documento identidad',
      'numero de documento',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.idDocument',
    defaultLabel: 'Documento de Identidad',
    placeholder: 'Ej: 1234567890',
    helpText: 'Sin puntos ni comas',
    category: 'personal',
  },
  {
    id: 'passport',
    keys: ['pasaporte', 'passport', 'numero pasaporte', 'passport number'],
    type: 'text',
    labelKey: 'forms.fieldLabel.passport',
    defaultLabel: 'Número de Pasaporte',
    placeholder: 'Ej: AB123456',
    category: 'personal',
  },
  {
    id: 'birthdate',
    keys: [
      'fecha nacimiento',
      'cumpleaños',
      'cumpleanos',
      'birthdate',
      'date of birth',
      'nacimiento',
      'cuando naciste',
      'dia de nacimiento',
    ],
    type: 'date',
    labelKey: 'forms.fieldLabel.birthdate',
    defaultLabel: 'Fecha de Nacimiento',
    helpText: 'DD/MM/AAAA',
    category: 'personal',
  },
  {
    id: 'age',
    keys: ['edad', 'age', 'años', 'anos', 'cuantos años', 'que edad', 'years old'],
    type: 'number',
    labelKey: 'forms.fieldLabel.age',
    defaultLabel: 'Edad',
    placeholder: 'Ej: 25',
    validation: { min: 0, max: 120, message: 'Edad debe estar entre 0 y 120' },
    category: 'personal',
  },
  {
    id: 'gender',
    keys: ['genero', 'género', 'sexo', 'gender', 'sex', 'mujer', 'hombre', 'masculino', 'femenino'],
    type: 'select',
    labelKey: 'forms.fieldLabel.gender',
    defaultLabel: 'Género',
    options: ['Masculino', 'Femenino', 'No binario', 'Prefiero no decir'],
    category: 'personal',
  },
  {
    id: 'marital_status',
    keys: ['estado civil', 'marital status', 'casado', 'soltero', 'civil status'],
    type: 'select',
    labelKey: 'forms.fieldLabel.maritalStatus',
    defaultLabel: 'Estado Civil',
    options: ['Soltero/a', 'Casado/a', 'Unión Libre', 'Divorciado/a', 'Viudo/a'],
    category: 'personal',
  },
  {
    id: 'nationality',
    keys: ['nacionalidad', 'nationality', 'origen', 'de donde eres', 'pais origen'],
    type: 'text',
    labelKey: 'forms.fieldLabel.nationality',
    defaultLabel: 'Nacionalidad',
    placeholder: 'Ej: Colombiana',
    category: 'personal',
  },

  // ===== UBICACIÓN Y DIRECCIÓN =====
  {
    id: 'address',
    keys: [
      'direccion',
      'dirección',
      'address',
      'domicilio',
      'ubicación',
      'ubicacion',
      'calle',
      'cr',
      'carrera',
      'residencia',
      'donde vives',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.address',
    defaultLabel: 'Dirección',
    placeholder: 'Calle 123 #45-67',
    helpText: 'Dirección completa con detalles',
    category: 'location',
  },
  {
    id: 'city',
    keys: ['ciudad', 'city', 'municipio', 'town', 'localidad', 'de que ciudad'],
    type: 'text',
    labelKey: 'forms.fieldLabel.city',
    defaultLabel: 'Ciudad',
    placeholder: 'Ej: Bogotá',
    category: 'location',
  },
  {
    id: 'state',
    keys: ['departamento', 'estado', 'state', 'provincia', 'region'],
    type: 'text',
    labelKey: 'forms.fieldLabel.state',
    defaultLabel: 'Departamento / Estado',
    placeholder: 'Ej: Cundinamarca',
    category: 'location',
  },
  {
    id: 'country',
    keys: ['pais', 'país', 'country', 'nacion', 'nación'],
    type: 'text',
    labelKey: 'forms.fieldLabel.country',
    defaultLabel: 'País',
    placeholder: 'Ej: Colombia',
    category: 'location',
  },
  {
    id: 'zip',
    keys: ['codigo postal', 'código postal', 'postal', 'zip', 'zip code', 'cp'],
    type: 'text',
    labelKey: 'forms.fieldLabel.zip',
    defaultLabel: 'Código Postal',
    placeholder: 'Ej: 110111',
    category: 'location',
  },
  {
    id: 'neighborhood',
    keys: ['barrio', 'neighborhood', 'colonia', 'sector', 'zona'],
    type: 'text',
    labelKey: 'forms.fieldLabel.neighborhood',
    defaultLabel: 'Barrio',
    placeholder: 'Ej: Chapinero',
    category: 'location',
  },

  // ===== EDUCACIÓN Y ACADEMIA =====
  {
    id: 'school',
    keys: [
      'colegio',
      'escuela',
      'school',
      'institución educativa',
      'institucion',
      'high school',
      'secundaria',
      'preparatoria',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.school',
    defaultLabel: 'Institución Educativa',
    placeholder: 'Ej: Colegio Nacional',
    category: 'education',
  },
  {
    id: 'university',
    keys: [
      'universidad',
      'university',
      'uni',
      'facultad',
      'campus',
      'college',
      'instituto superior',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.university',
    defaultLabel: 'Universidad',
    placeholder: 'Ej: Universidad Nacional de Colombia',
    category: 'education',
  },
  {
    id: 'grade',
    keys: ['grado', 'curso', 'semestre', 'grade', 'año escolar', 'nivel', 'year', 'ciclo'],
    type: 'text',
    labelKey: 'forms.fieldLabel.grade',
    defaultLabel: 'Grado / Semestre',
    placeholder: 'Ej: 5to Semestre',
    category: 'education',
  },
  {
    id: 'student_id',
    keys: [
      'codigo estudiantil',
      'código estudiantil',
      'carnet',
      'student id',
      'matricula',
      'matrícula',
      'numero estudiante',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.studentId',
    defaultLabel: 'Código Estudiantil',
    placeholder: 'Ej: 2020123456',
    category: 'education',
  },
  {
    id: 'career',
    keys: [
      'carrera',
      'programa',
      'major',
      'pregrado',
      'posgrado',
      'profesión',
      'especialidad',
      'que estudias',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.career',
    defaultLabel: 'Programa Académico',
    placeholder: 'Ej: Ingeniería de Sistemas',
    category: 'education',
  },
  {
    id: 'education_level',
    keys: ['nivel educativo', 'education level', 'escolaridad', 'estudios', 'nivel de estudios'],
    type: 'select',
    labelKey: 'forms.fieldLabel.educationLevel',
    defaultLabel: 'Nivel Educativo',
    options: [
      'Primaria',
      'Secundaria',
      'Técnico',
      'Tecnólogo',
      'Universitario',
      'Posgrado',
      'Maestría',
      'Doctorado',
    ],
    category: 'education',
  },
  {
    id: 'gpa',
    keys: ['promedio', 'gpa', 'calificaciones', 'nota promedio', 'average'],
    type: 'number',
    labelKey: 'forms.fieldLabel.gpa',
    defaultLabel: 'Promedio Académico',
    placeholder: 'Ej: 4.5',
    validation: { min: 0, max: 5, message: 'El promedio debe estar entre 0 y 5' },
    category: 'education',
  },
  {
    id: 'graduation_year',
    keys: ['año graduación', 'año de grado', 'graduation year', 'cuando te graduas', 'año egreso'],
    type: 'number',
    labelKey: 'forms.fieldLabel.graduationYear',
    defaultLabel: 'Año de Graduación',
    placeholder: 'Ej: 2024',
    category: 'education',
  },

  // ===== GAMING Y TECNOLOGÍA =====
  {
    id: 'gamertag',
    keys: [
      'gamertag',
      'usuario',
      'username',
      'nick',
      'apodo',
      'user',
      'nickname',
      'alias',
      'gamer name',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.gamertag',
    defaultLabel: 'Gamertag / Usuario',
    placeholder: 'Ej: ProGamer123',
    category: 'gaming',
  },
  {
    id: 'console',
    keys: [
      'consola',
      'console',
      'plataforma',
      'platform',
      'ps5',
      'xbox',
      'pc',
      'nintendo',
      'playstation',
      'donde juegas',
    ],
    type: 'select',
    labelKey: 'forms.fieldLabel.console',
    defaultLabel: 'Plataforma de Juego',
    options: [
      'PC',
      'PlayStation 5',
      'PlayStation 4',
      'Xbox Series X/S',
      'Xbox One',
      'Nintendo Switch',
      'Mobile',
      'Múltiples Plataformas',
    ],
    category: 'gaming',
  },
  {
    id: 'game_genre',
    keys: [
      'genero juego',
      'género favorito',
      'tipo de juego',
      'genre',
      'rpg',
      'fps',
      'moba',
      'que juegas',
      'juegos favoritos',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.gameGenre',
    defaultLabel: 'Género de Juego Favorito',
    placeholder: 'Ej: RPG, FPS, MOBA',
    category: 'gaming',
  },
  {
    id: 'favorite_game',
    keys: ['juego favorito', 'favorite game', 'cual es tu juego', 'que juego te gusta'],
    type: 'text',
    labelKey: 'forms.fieldLabel.favoriteGame',
    defaultLabel: 'Juego Favorito',
    placeholder: 'Ej: The Legend of Zelda',
    category: 'gaming',
  },
  {
    id: 'gaming_hours',
    keys: ['horas juego', 'gaming hours', 'cuanto juegas', 'tiempo de juego'],
    type: 'number',
    labelKey: 'forms.fieldLabel.gamingHours',
    defaultLabel: 'Horas de Juego por Semana',
    placeholder: 'Ej: 10',
    validation: { min: 0, max: 168, message: 'Máximo 168 horas por semana' },
    category: 'gaming',
  },
  {
    id: 'discord',
    keys: ['discord', 'discord username', 'usuario discord'],
    type: 'text',
    labelKey: 'forms.fieldLabel.discord',
    defaultLabel: 'Usuario de Discord',
    placeholder: 'Ej: usuario#1234',
    category: 'gaming',
  },
  {
    id: 'steam_id',
    keys: ['steam', 'steam id', 'perfil steam', 'cuenta steam'],
    type: 'text',
    labelKey: 'forms.fieldLabel.steamId',
    defaultLabel: 'Steam ID',
    placeholder: 'Ej: steamcommunity.com/id/...',
    category: 'gaming',
  },

  // ===== LABORAL Y PROFESIONAL =====
  {
    id: 'company',
    keys: [
      'empresa',
      'compañia',
      'compañía',
      'company',
      'organizacion',
      'organización',
      'donde trabajas',
      'empleador',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.company',
    defaultLabel: 'Empresa',
    placeholder: 'Ej: Tech Solutions S.A.',
    category: 'professional',
  },
  {
    id: 'role',
    keys: [
      'cargo',
      'puesto',
      'rol',
      'role',
      'position',
      'trabajo',
      'job',
      'ocupación',
      'que haces',
      'tu trabajo',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.role',
    defaultLabel: 'Cargo / Posición',
    placeholder: 'Ej: Desarrollador Senior',
    category: 'professional',
  },
  {
    id: 'department',
    keys: ['departamento', 'department', 'area', 'área', 'division', 'sector'],
    type: 'text',
    labelKey: 'forms.fieldLabel.department',
    defaultLabel: 'Departamento',
    placeholder: 'Ej: Tecnología',
    category: 'professional',
  },
  {
    id: 'years_experience',
    keys: [
      'años experiencia',
      'años de experiencia',
      'experience',
      'experiencia',
      'cuanta experiencia',
      'tiempo trabajando',
    ],
    type: 'number',
    labelKey: 'forms.fieldLabel.yearsExperience',
    defaultLabel: 'Años de Experiencia',
    placeholder: 'Ej: 5',
    validation: { min: 0, max: 60, message: 'Experiencia debe ser entre 0 y 60 años' },
    category: 'professional',
  },
  {
    id: 'linkedin',
    keys: ['linkedin', 'perfil profesional', 'perfil linkedin', 'linkedin profile'],
    type: 'url',
    labelKey: 'forms.fieldLabel.linkedin',
    defaultLabel: 'Perfil de LinkedIn',
    placeholder: 'https://linkedin.com/in/tu-perfil',
    category: 'professional',
  },
  {
    id: 'cv',
    keys: ['cv', 'hoja de vida', 'resume', 'curriculum', 'curriculum vitae', 'adjuntar cv'],
    type: 'file',
    labelKey: 'forms.fieldLabel.cv',
    defaultLabel: 'Adjuntar CV / Hoja de Vida',
    helpText: 'Formato PDF preferiblemente',
    category: 'professional',
  },
  {
    id: 'portfolio',
    keys: ['portafolio', 'portfolio', 'trabajos', 'proyectos', 'link portafolio'],
    type: 'url',
    labelKey: 'forms.fieldLabel.portfolio',
    defaultLabel: 'Portafolio / Portfolio',
    placeholder: 'https://miportfolio.com',
    category: 'professional',
  },
  {
    id: 'salary_expectation',
    keys: [
      'salario esperado',
      'expectativa salarial',
      'salary expectation',
      'cuanto quieres ganar',
      'pretensión salarial',
    ],
    type: 'number',
    labelKey: 'forms.fieldLabel.salaryExpectation',
    defaultLabel: 'Expectativa Salarial',
    placeholder: 'Ej: 5000000',
    category: 'professional',
  },
  {
    id: 'availability',
    keys: ['disponibilidad', 'availability', 'cuando puedes empezar', 'fecha inicio', 'start date'],
    type: 'date',
    labelKey: 'forms.fieldLabel.availability',
    defaultLabel: 'Disponibilidad para Iniciar',
    category: 'professional',
  },

  // ===== SALUD Y MÉDICO =====
  {
    id: 'blood_type',
    keys: ['tipo sangre', 'tipo de sangre', 'blood type', 'rh', 'grupo sanguíneo'],
    type: 'select',
    labelKey: 'forms.fieldLabel.bloodType',
    defaultLabel: 'Tipo de Sangre',
    options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    category: 'health',
  },
  {
    id: 'allergies',
    keys: ['alergias', 'allergies', 'alergico', 'alérgico', 'reacciones'],
    type: 'textarea',
    labelKey: 'forms.fieldLabel.allergies',
    defaultLabel: 'Alergias',
    placeholder: 'Lista cualquier alergia conocida',
    category: 'health',
  },
  {
    id: 'medical_conditions',
    keys: [
      'condiciones medicas',
      'condiciones médicas',
      'medical conditions',
      'enfermedades',
      'padecimientos',
    ],
    type: 'textarea',
    labelKey: 'forms.fieldLabel.medicalConditions',
    defaultLabel: 'Condiciones Médicas',
    placeholder: 'Describe condiciones médicas relevantes',
    category: 'health',
  },
  {
    id: 'medications',
    keys: ['medicamentos', 'medications', 'medicinas', 'que tomas', 'tratamiento'],
    type: 'textarea',
    labelKey: 'forms.fieldLabel.medications',
    defaultLabel: 'Medicamentos Actuales',
    placeholder: 'Lista medicamentos que tomas actualmente',
    category: 'health',
  },
  {
    id: 'insurance',
    keys: ['seguro medico', 'seguro médico', 'insurance', 'eps', 'obra social', 'salud'],
    type: 'text',
    labelKey: 'forms.fieldLabel.insurance',
    defaultLabel: 'Seguro Médico / EPS',
    placeholder: 'Ej: Sanitas',
    category: 'health',
  },
  {
    id: 'emergency_contact',
    keys: [
      'contacto emergencia',
      'contacto de emergencia',
      'emergency contact',
      'persona contactar',
    ],
    type: 'text',
    labelKey: 'forms.fieldLabel.emergencyContact',
    defaultLabel: 'Contacto de Emergencia',
    placeholder: 'Nombre y teléfono',
    category: 'health',
  },

  // ===== EVENTOS Y REGISTRO =====
  {
    id: 'event_name',
    keys: ['nombre evento', 'event name', 'cual evento', 'que evento'],
    type: 'text',
    labelKey: 'forms.fieldLabel.eventName',
    defaultLabel: 'Nombre del Evento',
    placeholder: 'Ej: Conferencia Tech 2024',
    category: 'events',
  },
  {
    id: 'attendance',
    keys: [
      'asistencia',
      'attendance',
      'vas asistir',
      'confirmar asistencia',
      'asistiré',
      'participar',
    ],
    type: 'radio',
    labelKey: 'forms.fieldLabel.attendance',
    defaultLabel: 'Confirmar Asistencia',
    options: ['Sí, asistiré', 'No puedo asistir', 'Tal vez'],
    category: 'events',
  },
  {
    id: 'num_guests',
    keys: [
      'numero invitados',
      'número de invitados',
      'guests',
      'acompañantes',
      'cuantos van',
      'personas',
    ],
    type: 'number',
    labelKey: 'forms.fieldLabel.numGuests',
    defaultLabel: 'Número de Invitados',
    placeholder: 'Ej: 2',
    validation: { min: 1, max: 10, message: 'Máximo 10 invitados' },
    category: 'events',
  },
  {
    id: 'dietary_restrictions',
    keys: [
      'restricciones alimentarias',
      'restricciones alimenticias',
      'dietary restrictions',
      'comida',
      'alimentos',
      'dieta',
      'vegetariano',
    ],
    type: 'textarea',
    labelKey: 'forms.fieldLabel.dietaryRestrictions',
    defaultLabel: 'Restricciones Alimentarias',
    placeholder: 'Ej: Vegetariano, sin gluten',
    category: 'events',
  },
  {
    id: 'tshirt_size',
    keys: ['talla camisa', 'talla camiseta', 'tshirt size', 'shirt size', 'talla', 'size'],
    type: 'select',
    labelKey: 'forms.fieldLabel.tshirtSize',
    defaultLabel: 'Talla de Camiseta',
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    category: 'events',
  },

  // ===== FEEDBACK Y SATISFACCIÓN =====
  {
    id: 'rating',
    keys: [
      'calificacion',
      'calificación',
      'puntuación',
      'rating',
      'stars',
      'estrellas',
      'score',
      'evaluación',
      'como calificarias',
    ],
    type: 'select',
    labelKey: 'forms.fieldLabel.rating',
    defaultLabel: 'Calificación',
    options: ['5 - Excelente', '4 - Bueno', '3 - Regular', '2 - Malo', '1 - Pésimo'],
    category: 'feedback',
  },
  {
    id: 'satisfaction',
    keys: ['satisfaccion', 'satisfacción', 'satisfaction', 'que tan satisfecho', 'contento'],
    type: 'select',
    labelKey: 'forms.fieldLabel.satisfaction',
    defaultLabel: 'Nivel de Satisfacción',
    options: ['Muy satisfecho', 'Satisfecho', 'Neutral', 'Insatisfecho', 'Muy insatisfecho'],
    category: 'feedback',
  },
  {
    id: 'recommendation',
    keys: ['recomendarias', 'recomendar', 'recommend', 'recommendation', 'nps'],
    type: 'select',
    labelKey: 'forms.fieldLabel.recommendation',
    defaultLabel: '¿Nos recomendarías?',
    options: [
      'Definitivamente sí',
      'Probablemente sí',
      'No estoy seguro',
      'Probablemente no',
      'Definitivamente no',
    ],
    category: 'feedback',
  },
  {
    id: 'comments',
    keys: [
      'comentario',
      'comentarios',
      'mensaje',
      'observación',
      'observacion',
      'detalle',
      'comment',
      'message',
      'feedback',
      'opinión',
      'opinion',
      'sugerencia',
    ],
    type: 'textarea',
    labelKey: 'forms.fieldLabel.comments',
    defaultLabel: 'Comentarios',
    placeholder: 'Comparte tus comentarios o sugerencias...',
    helpText: 'Tu opinión es muy importante para nosotros',
    category: 'feedback',
  },
  {
    id: 'suggestions',
    keys: ['sugerencias', 'suggestions', 'mejoras', 'improvements', 'que mejorarias'],
    type: 'textarea',
    labelKey: 'forms.fieldLabel.suggestions',
    defaultLabel: 'Sugerencias de Mejora',
    placeholder: '¿Qué podríamos mejorar?',
    category: 'feedback',
  },

  // ===== FINANCIERO Y PAGOS =====
  {
    id: 'payment_method',
    keys: ['metodo pago', 'método de pago', 'payment method', 'como pagas', 'forma de pago'],
    type: 'select',
    labelKey: 'forms.fieldLabel.paymentMethod',
    defaultLabel: 'Método de Pago',
    options: [
      'Tarjeta de Crédito',
      'Tarjeta de Débito',
      'Transferencia',
      'Efectivo',
      'PayPal',
      'PSE',
    ],
    category: 'financial',
  },
  {
    id: 'card_number',
    keys: ['numero tarjeta', 'número de tarjeta', 'card number', 'tarjeta'],
    type: 'text',
    labelKey: 'forms.fieldLabel.cardNumber',
    defaultLabel: 'Número de Tarjeta',
    placeholder: '**** **** **** ****',
    category: 'financial',
  },
  {
    id: 'bank_account',
    keys: ['cuenta bancaria', 'bank account', 'numero cuenta', 'cuenta'],
    type: 'text',
    labelKey: 'forms.fieldLabel.bankAccount',
    defaultLabel: 'Número de Cuenta',
    placeholder: 'Ej: 1234567890',
    category: 'financial',
  },
  {
    id: 'income',
    keys: ['ingresos', 'income', 'salario', 'sueldo', 'cuanto ganas'],
    type: 'number',
    labelKey: 'forms.fieldLabel.income',
    defaultLabel: 'Ingresos Mensuales',
    placeholder: 'Ej: 3000000',
    category: 'financial',
  },

  // ===== REDES SOCIALES =====
  {
    id: 'facebook',
    keys: ['facebook', 'fb', 'perfil facebook'],
    type: 'url',
    labelKey: 'forms.fieldLabel.facebook',
    defaultLabel: 'Facebook',
    placeholder: 'https://facebook.com/tu-perfil',
    category: 'social',
  },
  {
    id: 'instagram',
    keys: ['instagram', 'ig', 'insta', 'perfil instagram'],
    type: 'text',
    labelKey: 'forms.fieldLabel.instagram',
    defaultLabel: 'Instagram',
    placeholder: '@tuusuario',
    category: 'social',
  },
  {
    id: 'twitter',
    keys: ['twitter', 'x', 'perfil twitter', 'cuenta twitter'],
    type: 'text',
    labelKey: 'forms.fieldLabel.twitter',
    defaultLabel: 'Twitter / X',
    placeholder: '@tuusuario',
    category: 'social',
  },
  {
    id: 'tiktok',
    keys: ['tiktok', 'tik tok', 'perfil tiktok'],
    type: 'text',
    labelKey: 'forms.fieldLabel.tiktok',
    defaultLabel: 'TikTok',
    placeholder: '@tuusuario',
    category: 'social',
  },
  {
    id: 'youtube',
    keys: ['youtube', 'canal youtube', 'yt'],
    type: 'url',
    labelKey: 'forms.fieldLabel.youtube',
    defaultLabel: 'Canal de YouTube',
    placeholder: 'https://youtube.com/@tucanal',
    category: 'social',
  },

  // ===== ARCHIVOS Y DOCUMENTOS =====
  {
    id: 'file',
    keys: [
      'archivo',
      'adjunto',
      'file',
      'documento',
      'pdf',
      'foto',
      'imagen',
      'subir',
      'cargar',
      'attachment',
    ],
    type: 'file',
    labelKey: 'forms.fieldLabel.file',
    defaultLabel: 'Adjuntar Archivo',
    helpText: 'Formatos permitidos: PDF, JPG, PNG (Max 5MB)',
    category: 'general',
  },
  {
    id: 'photo',
    keys: ['foto', 'photo', 'fotografia', 'imagen personal', 'selfie'],
    type: 'file',
    labelKey: 'forms.fieldLabel.photo',
    defaultLabel: 'Fotografía',
    helpText: 'Sube tu foto personal',
    category: 'general',
  },
  {
    id: 'document_upload',
    keys: ['cargar documento', 'upload document', 'subir documento'],
    type: 'file',
    labelKey: 'forms.fieldLabel.documentUpload',
    defaultLabel: 'Cargar Documento',
    category: 'general',
  },

  // ===== FECHAS Y TIEMPO =====
  {
    id: 'date',
    keys: ['fecha', 'date', 'dia', 'día', 'cuando', 'que fecha'],
    type: 'date',
    labelKey: 'forms.fieldLabel.date',
    defaultLabel: 'Fecha',
    category: 'general',
  },
  {
    id: 'time',
    keys: ['hora', 'time', 'horario', 'que hora', 'a que hora'],
    type: 'time',
    labelKey: 'forms.fieldLabel.time',
    defaultLabel: 'Hora',
    category: 'general',
  },
  {
    id: 'datetime',
    keys: ['fecha hora', 'datetime', 'fecha y hora'],
    type: 'datetime-local',
    labelKey: 'forms.fieldLabel.datetime',
    defaultLabel: 'Fecha y Hora',
    category: 'general',
  },

  // ===== PREFERENCIAS =====
  {
    id: 'language',
    keys: ['idioma', 'language', 'lengua', 'que idioma', 'hablas'],
    type: 'select',
    labelKey: 'forms.fieldLabel.language',
    defaultLabel: 'Idioma',
    options: ['Español', 'Inglés', 'Portugués', 'Francés', 'Alemán', 'Italiano', 'Otro'],
    category: 'preferences',
  },
  {
    id: 'newsletter',
    keys: ['newsletter', 'boletin', 'boletín', 'noticias', 'suscripción', 'suscribirse'],
    type: 'checkbox',
    labelKey: 'forms.fieldLabel.newsletter',
    defaultLabel: 'Deseo recibir el boletín informativo',
    category: 'preferences',
  },
  {
    id: 'notifications',
    keys: ['notificaciones', 'notifications', 'alertas', 'avisos'],
    type: 'checkbox',
    labelKey: 'forms.fieldLabel.notifications',
    defaultLabel: 'Recibir notificaciones',
    category: 'preferences',
  },

  // ===== LEGAL Y TÉRMINOS =====
  {
    id: 'terms',
    keys: [
      'habeas',
      'data',
      'términos',
      'terminos',
      'condiciones',
      'terms',
      'privacy',
      'privacidad',
      'politica',
      'política',
      'autorizo',
      'acepto',
    ],
    type: 'habeasData',
    labelKey: 'forms.fieldLabel.terms',
    defaultLabel: 'Acepto términos y condiciones',
    options: { message: 'He leído y acepto la política de tratamiento de datos personales.' },
    category: 'legal',
  },
  {
    id: 'gdpr_consent',
    keys: ['gdpr', 'consentimiento', 'consent', 'protección datos', 'rgpd'],
    type: 'checkbox',
    labelKey: 'forms.fieldLabel.gdprConsent',
    defaultLabel: 'Acepto el tratamiento de mis datos personales',
    category: 'legal',
  },

  // ===== OTROS CAMPOS ÚTILES =====
  {
    id: 'website',
    keys: ['sitio web', 'website', 'web', 'pagina web', 'página', 'url', 'link'],
    type: 'url',
    labelKey: 'forms.fieldLabel.website',
    defaultLabel: 'Sitio Web',
    placeholder: 'https://ejemplo.com',
    category: 'general',
  },
  {
    id: 'referral',
    keys: ['referido', 'referral', 'como nos conociste', 'donde nos conociste', 'quien te refirio'],
    type: 'select',
    labelKey: 'forms.fieldLabel.referral',
    defaultLabel: '¿Cómo nos conociste?',
    options: [
      'Redes Sociales',
      'Búsqueda en Google',
      'Recomendación',
      'Publicidad',
      'Evento',
      'Otro',
    ],
    category: 'general',
  },
  {
    id: 'quantity',
    keys: ['cantidad', 'quantity', 'cuantos', 'número', 'numero'],
    type: 'number',
    labelKey: 'forms.fieldLabel.quantity',
    defaultLabel: 'Cantidad',
    placeholder: 'Ej: 1',
    validation: { min: 1, message: 'La cantidad debe ser mayor a 0' },
    category: 'general',
  },
  {
    id: 'budget',
    keys: ['presupuesto', 'budget', 'cuanto tienes', 'inversión', 'inversion'],
    type: 'number',
    labelKey: 'forms.fieldLabel.budget',
    defaultLabel: 'Presupuesto',
    placeholder: 'Ej: 1000000',
    category: 'financial',
  },
  {
    id: 'experience_description',
    keys: ['describe experiencia', 'experiencia', 'cuéntanos', 'cuentanos', 'describe'],
    type: 'textarea',
    labelKey: 'forms.fieldLabel.experienceDescription',
    defaultLabel: 'Describe tu experiencia',
    placeholder: 'Cuéntanos sobre tu experiencia...',
    category: 'general',
  },
];

// ============================================================================
// DOMAIN-SPECIFIC TEMPLATES
// ============================================================================

interface DomainTemplate {
  keywords: string[];
  title: string;
  description: string;
  category: string;
  essentialFields: string[];
  optionalFields: string[];
  submitButtonText: string;
  successMessage: string;
}

const DOMAIN_TEMPLATES: DomainTemplate[] = [
  {
    keywords: [
      'universidad',
      'universitario',
      'estudiante',
      'academic',
      'estudiantes',
      'matricula',
      'inscripción',
    ],
    title: 'Formulario Universitario',
    description: 'Registro de información académica para estudiantes universitarios.',
    category: 'education',
    essentialFields: ['fullname', 'student_id', 'email', 'career', 'university', 'grade'],
    optionalFields: ['phone', 'id_doc', 'birthdate', 'address'],
    submitButtonText: 'Enviar Registro',
    successMessage: '¡Registro académico completado exitosamente!',
  },
  {
    keywords: [
      'empleo',
      'trabajo',
      'vacante',
      'job',
      'aplicación',
      'postulación',
      'carrera profesional',
      'recruitment',
    ],
    title: 'Solicitud de Empleo',
    description: 'Formulario de postulación para oportunidades laborales.',
    category: 'professional',
    essentialFields: ['fullname', 'email', 'phone', 'role', 'years_experience', 'cv'],
    optionalFields: [
      'linkedin',
      'portfolio',
      'education_level',
      'availability',
      'salary_expectation',
    ],
    submitButtonText: 'Enviar Postulación',
    successMessage: '¡Tu aplicación ha sido recibida! Te contactaremos pronto.',
  },
  {
    keywords: ['juego', 'gamer', 'gaming', 'videojuego', 'esports', 'torneo', 'competencia'],
    title: 'Registro de Jugador',
    description: 'Inscripción para la comunidad gaming y eventos esports.',
    category: 'gaming',
    essentialFields: ['fullname', 'gamertag', 'email', 'console', 'game_genre'],
    optionalFields: ['discord', 'steam_id', 'age', 'favorite_game', 'gaming_hours'],
    submitButtonText: 'Unirse a la Comunidad',
    successMessage: '¡Bienvenido a la comunidad gaming!',
  },
  {
    keywords: ['contacto', 'contact', 'comunicación', 'mensaje', 'consulta', 'soporte'],
    title: 'Formulario de Contacto',
    description: 'Estamos aquí para ayudarte. Déjanos tu mensaje.',
    category: 'general',
    essentialFields: ['fullname', 'email', 'phone', 'comments'],
    optionalFields: ['company', 'subject'],
    submitButtonText: 'Enviar Mensaje',
    successMessage: '¡Mensaje enviado! Te responderemos pronto.',
  },
  {
    keywords: [
      'satisfacción',
      'satisfaccion',
      'feedback',
      'encuesta',
      'opinión',
      'calidad',
      'evaluación',
    ],
    title: 'Encuesta de Satisfacción',
    description: 'Tu opinión es muy importante para nosotros.',
    category: 'feedback',
    essentialFields: ['fullname', 'email', 'rating', 'satisfaction', 'comments'],
    optionalFields: ['recommendation', 'suggestions'],
    submitButtonText: 'Enviar Encuesta',
    successMessage: '¡Gracias por tu feedback!',
  },
  {
    keywords: [
      'evento',
      'event',
      'asistencia',
      'registro evento',
      'conferencia',
      'workshop',
      'seminario',
    ],
    title: 'Registro al Evento',
    description: 'Confirma tu asistencia y ayúdanos a planificar mejor.',
    category: 'events',
    essentialFields: ['fullname', 'email', 'phone', 'attendance'],
    optionalFields: ['num_guests', 'dietary_restrictions', 'tshirt_size', 'company'],
    submitButtonText: 'Confirmar Asistencia',
    successMessage: '¡Registro confirmado! Nos vemos en el evento.',
  },
  {
    keywords: [
      'salud',
      'médico',
      'medico',
      'paciente',
      'clinic',
      'hospital',
      'cita',
      'consulta médica',
    ],
    title: 'Formulario de Información Médica',
    description: 'Información clínica para tu historial médico.',
    category: 'health',
    essentialFields: ['fullname', 'id_doc', 'birthdate', 'phone', 'email', 'blood_type'],
    optionalFields: [
      'allergies',
      'medical_conditions',
      'medications',
      'insurance',
      'emergency_contact',
    ],
    submitButtonText: 'Guardar Información',
    successMessage: 'Información médica guardada correctamente.',
  },
  {
    keywords: [
      'inscripción',
      'inscripcion',
      'registro',
      'sign up',
      'membership',
      'membresía',
      'afiliación',
    ],
    title: 'Formulario de Inscripción',
    description: 'Completa tu registro para comenzar.',
    category: 'general',
    essentialFields: ['fullname', 'email', 'phone', 'id_doc'],
    optionalFields: ['birthdate', 'address', 'city', 'terms'],
    submitButtonText: 'Completar Inscripción',
    successMessage: '¡Bienvenido! Tu inscripción está completa.',
  },
  {
    keywords: ['reserva', 'reservation', 'booking', 'cita', 'appointment', 'agendar'],
    title: 'Formulario de Reserva',
    description: 'Agenda tu cita o reserva.',
    category: 'general',
    essentialFields: ['fullname', 'email', 'phone', 'date', 'time'],
    optionalFields: ['comments', 'num_guests'],
    submitButtonText: 'Confirmar Reserva',
    successMessage: '¡Reserva confirmada! Te esperamos.',
  },
  {
    keywords: ['newsletter', 'suscripción', 'suscripcion', 'boletin', 'updates'],
    title: 'Suscripción al Boletín',
    description: 'Mantente informado con nuestras novedades.',
    category: 'general',
    essentialFields: ['email', 'fullname'],
    optionalFields: ['newsletter', 'notifications', 'language'],
    submitButtonText: 'Suscribirse',
    successMessage: '¡Suscripción exitosa! Revisa tu email.',
  },
  {
    keywords: ['donación', 'donacion', 'donation', 'contribución', 'apoyo'],
    title: 'Formulario de Donación',
    description: 'Tu apoyo hace la diferencia.',
    category: 'financial',
    essentialFields: ['fullname', 'email', 'phone', 'payment_method'],
    optionalFields: ['budget', 'comments', 'anonymous'],
    submitButtonText: 'Realizar Donación',
    successMessage: '¡Gracias por tu generosa donación!',
  },
];

// ============================================================================
// FUZZY SEARCH CONFIGURATION
// ============================================================================

const fuseOptions = {
  includeScore: true,
  threshold: 0.35,
  keys: ['keys'],
  distance: 100,
  minMatchCharLength: 3,
};

const fuse = new Fuse(FIELD_DICTIONARY, fuseOptions);

// ============================================================================
// MAIN FORM GENERATION FUNCTION
// ============================================================================

export const generateFormFromPrompt = (
  prompt: string,
  t: (key: string) => string
): GeneratedForm | null => {
  const doc = nlp(prompt.toLowerCase());
  const text = doc.text();

  // 1. INTENT DETECTION
  const intentKeywords = [
    'crear',
    'hacer',
    'generar',
    'nuevo',
    'necesito',
    'quiero',
    'create',
    'make',
    'generate',
    'new',
    'need',
    'want',
    'form',
    'formulario',
    'encuesta',
    'survey',
    'registro',
    'construir',
    'diseñar',
    'armar',
    'build',
  ];

  if (!intentKeywords.some((k) => text.includes(k))) return null;

  // 2. DOMAIN DETECTION
  let matchedTemplate: DomainTemplate | null = null;
  let maxMatches = 0;

  for (const template of DOMAIN_TEMPLATES) {
    const matches = template.keywords.filter((kw) => text.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      matchedTemplate = template;
    }
  }

  // 3. TITLE AND DESCRIPTION EXTRACTION
  let title = matchedTemplate?.title || 'Formulario Personalizado';
  const description =
    matchedTemplate?.description || 'Por favor complete la siguiente información.';
  const submitButtonText = matchedTemplate?.submitButtonText || 'Enviar';
  const successMessage = matchedTemplate?.successMessage || '¡Formulario enviado exitosamente!';
  const category = matchedTemplate?.category || 'general';

  // Try to extract title from quotes
  const quoteMatch = text.match(/['""""]([^'""""]+)['"""""]/);
  if (quoteMatch) {
    title = quoteMatch[1];
  }

  // 4. FIELD DETECTION
  const detectedFields: GeneratedFormField[] = [];
  const addedFieldIds = new Set<string>();

  // Tokenize the prompt
  const separators =
    /,| y | con | and | with | para | for | incluye | que tenga | field | campo | plus | más | de | del | la | el | un | una | también | tambien | además | ademas /;
  let tokens = text
    .split(separators)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  // Add individual words from multi-word tokens
  const extraTokens: string[] = [];
  tokens.forEach((token) => {
    if (token.includes(' ')) {
      const subWords = token.split(' ').filter((w) => w.length > 3);
      extraTokens.push(...subWords);
    }
  });
  tokens = [...tokens, ...extraTokens];

  // Remove duplicates
  tokens = [...new Set(tokens)];

  // 5. FUZZY SEARCH FOR EACH TOKEN
  tokens.forEach((token) => {
    const results = fuse.search(token);

    results.forEach((res) => {
      if (res.score !== undefined && res.score < 0.4) {
        if (!addedFieldIds.has(res.item.id)) {
          addFieldFromDefinition(res.item, detectedFields, addedFieldIds, t);
        }
      }
    });
  });

  // 6. ADD TEMPLATE ESSENTIAL FIELDS
  if (matchedTemplate && detectedFields.length < 3) {
    matchedTemplate.essentialFields.forEach((fieldId) => {
      addFieldById(fieldId, detectedFields, addedFieldIds, t);
    });
  }

  // 7. FALLBACK - ADD BASIC FIELDS
  if (detectedFields.length === 0) {
    ['fullname', 'email', 'phone', 'comments'].forEach((id) => {
      addFieldById(id, detectedFields, addedFieldIds, t);
    });
  }

  // 8. SMART FIELD ADDITIONS BASED ON CONTEXT
  // Add terms automatically for certain categories
  if (category === 'professional' || category === 'education' || category === 'health') {
    if (!addedFieldIds.has('terms')) {
      addFieldById('terms', detectedFields, addedFieldIds, t);
    }
  }

  // 9. SORT FIELDS BY LOGICAL ORDER
  const fieldOrder = [
    'fullname',
    'firstname',
    'lastname',
    'email',
    'phone',
    'id_doc',
    'birthdate',
    'age',
    'gender',
    'address',
    'city',
    'country',
    'student_id',
    'university',
    'career',
    'grade',
    'company',
    'role',
    'years_experience',
    'gamertag',
    'console',
    'game_genre',
    'comments',
    'rating',
    'satisfaction',
    'terms',
  ];

  detectedFields.sort((a, b) => {
    const aField = FIELD_DICTIONARY.find((f) => f.defaultLabel === a.label);
    const bField = FIELD_DICTIONARY.find((f) => f.defaultLabel === b.label);
    const aIndex = aField ? fieldOrder.indexOf(aField.id) : 999;
    const bIndex = bField ? fieldOrder.indexOf(bField.id) : 999;
    return aIndex - bIndex;
  });

  return {
    title,
    description,
    fields: detectedFields,
    category,
    submitButtonText,
    successMessage,
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function addFieldFromDefinition(
  def: FieldDefinition,
  list: GeneratedFormField[],
  set: Set<string>,
  t: (key: string) => string
) {
  if (set.has(def.id)) return;

  const field: GeneratedFormField = {
    type: def.type,
    label: t(def.labelKey) !== def.labelKey ? t(def.labelKey) : def.defaultLabel,
    required: true,
  };

  if (def.placeholder) field.placeholder = def.placeholder;
  if (def.helpText) field.helpText = def.helpText;
  if (def.options) field.options = def.options;
  if (def.validation) field.validation = def.validation;

  if (def.type === 'habeasData') {
    field.options = {
      message:
        t('forms.fieldLabel.termsMessage') ||
        'He leído y acepto la política de tratamiento de datos personales.',
    };
  }

  list.push(field);
  set.add(def.id);
}

function addFieldById(
  id: string,
  list: GeneratedFormField[],
  set: Set<string>,
  t: (key: string) => string
) {
  if (set.has(id)) return;

  const def = FIELD_DICTIONARY.find((f) => f.id === id);
  if (!def) return;

  addFieldFromDefinition(def, list, set, t);
}

// ============================================================================
// ADDITIONAL UTILITY FUNCTIONS
// ============================================================================

export const getFieldById = (id: string): FieldDefinition | undefined => {
  return FIELD_DICTIONARY.find((f) => f.id === id);
};

export const getFieldsByCategory = (category: string): FieldDefinition[] => {
  return FIELD_DICTIONARY.filter((f) => f.category === category);
};

export const getAllCategories = (): string[] => {
  return [...new Set(FIELD_DICTIONARY.map((f) => f.category))];
};

export const searchFields = (query: string): FieldDefinition[] => {
  const results = fuse.search(query);
  return results.map((r) => r.item);
};
