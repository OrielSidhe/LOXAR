// Tour steps for the GuidedTour component
// Each step highlights a UI element via its CSS selector

interface TourStep {
    selector: string;
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const MAIN_TOUR_STEPS: TourStep[] = [
    {
        selector: '[role="tab"][aria-selected="true"]',
        title: '¡Bienvenido a Loxar!',
        content: 'Estas pestañas te permiten navegar entre las distintas herramientas de la aplicación: Panel, Léxico, Workbench, Colecciones y más.',
        position: 'bottom',
    },
    {
        selector: 'main',
        title: 'Panel Central',
        content: 'Aquí se muestra el contenido de la pestaña activa. El Panel principal te ofrece un resumen del estado de tu léxico y accesos rápidos.',
        position: 'top',
    },
    {
        selector: 'header',
        title: 'Cabecera de la App',
        content: 'Desde aquí puedes gestionar tus léxicos, importar/exportar datos y configurar las opciones principales.',
        position: 'bottom',
    },
];

export const COLLECTIONS_TOUR_STEPS: TourStep[] = [
    {
        selector: 'main',
        title: 'Gestor de Colecciones',
        content: 'Organiza las entradas de tu léxico en colecciones temáticas. Puedes crear, editar y explorar agrupaciones de palabras.',
        position: 'top',
    },
    {
        selector: '[role="tab"][aria-selected="true"]',
        title: 'Pestaña de Colecciones',
        content: 'Estás en el gestor de colecciones. Aquí puedes crear subgrupos de tu léxico para organizarlo mejor.',
        position: 'bottom',
    },
];

export const WRITING_TOUR_STEPS: TourStep[] = [
    {
        selector: 'main',
        title: 'Taller de Escritura',
        content: 'Este es tu espacio para redactar textos en tu conlang. Usa el corpus para guardar ejemplos de uso real de las palabras.',
        position: 'top',
    },
    {
        selector: '[role="tab"][aria-selected="true"]',
        title: 'Pestaña de Escritura',
        content: 'Escribe textos de ejemplo, frases o historias cortas usando el vocabulario de tu léxico activo.',
        position: 'bottom',
    },
];

export const TOOLS_TOUR_STEPS: TourStep[] = [
    {
        selector: 'main',
        title: 'Herramientas Avanzadas',
        content: 'Este panel concentra las funciones de IA y análisis: completar funciones gramaticales, rellenar campos vacíos, y analizar listas de palabras sugeridas.',
        position: 'top',
    },
    {
        selector: '[role="tab"][aria-selected="true"]',
        title: 'Pestaña de Herramientas',
        content: 'Aquí encontrarás atajos a todas las funciones de análisis y generación asistida por IA de tu léxico.',
        position: 'bottom',
    },
];
