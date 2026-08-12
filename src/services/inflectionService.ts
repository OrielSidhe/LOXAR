import { InflectionParadigm, InflectionRule, InflectionProfile, LexiconEntry } from '../types';

export const filterParadigmsForFunction = (paradigms: InflectionParadigm[], targetFunction: string): InflectionParadigm[] => {
    if (!paradigms) return [];
    const results: InflectionParadigm[] = [];
    for (const paradigm of paradigms) {
        const applies = !paradigm.appliesTo || paradigm.appliesTo.length === 0 || paradigm.appliesTo.includes(targetFunction);
        const filteredSubParadigms = paradigm.paradigms ? filterParadigmsForFunction(paradigm.paradigms, targetFunction) : [];
        if (applies || filteredSubParadigms.length > 0) {
            results.push({ ...paradigm, paradigms: filteredSubParadigms });
        }
    }
    return results;
};

export const findParadigmById = (paradigms: InflectionParadigm[], id: string): InflectionParadigm | null => {
    for (const paradigm of paradigms) {
        if (paradigm.id === id) return paradigm;
        if (paradigm.paradigms) {
            const found = findParadigmById(paradigm.paradigms, id);
            if (found) return found;
        }
    }
    return null;
};

const applyRule = (rule: InflectionRule, baseLexeme: string): { name: string, result: string } => {
    let result = baseLexeme;
    if (rule.type === 'simple') {
        result = rule.template.replace(/\{RAÍZ\}|\[RAÍZ\]/g, baseLexeme);
    } else if (rule.type === 'conditional') {
        const conditionMet =
            (rule.conditionType === 'endsWith' && baseLexeme.endsWith(rule.conditionValue)) ||
            (rule.conditionType === 'startsWith' && baseLexeme.startsWith(rule.conditionValue)) ||
            (rule.conditionType === 'contains' && baseLexeme.includes(rule.conditionValue));

        if (conditionMet) {
            if (rule.actionType === 'replaceEnding' && baseLexeme.endsWith(rule.conditionValue)) {
                result = baseLexeme.slice(0, -rule.conditionValue.length) + rule.actionValue;
            } else if (rule.actionType === 'addSuffix') {
                result = baseLexeme + rule.actionValue;
            } else if (rule.actionType === 'addPrefix') {
                result = rule.actionValue + baseLexeme;
            }
        }
    }
    return { name: rule.name, result };
};

const getAllRules = (paradigm: InflectionParadigm, baseLexeme: string): { name: string, result: string }[] => [
    ...paradigm.rules.map(rule => applyRule(rule, baseLexeme)),
    ...(paradigm.paradigms?.flatMap(p => getAllRules(p, baseLexeme)) || [])
];

export const generateInflectedForms = (entry: LexiconEntry, paradigm: InflectionParadigm, profile: InflectionProfile): { name: string, result: string }[] => {
    const baseLexeme = (entry.Léxema[0] || entry.Raíz).replace(/-$/, '');

    let forms = getAllRules(paradigm, baseLexeme);

    // Apply Phonological Rules (Euphonic adjustments)
    if (profile.phonologicalRules && profile.phonologicalRules.length > 0) {
        forms = forms.map(form => {
            let currentResult = form.result;
            for (const phonoRule of profile.phonologicalRules || []) {
                try {
                    if (phonoRule.isRegex) {
                        const regex = new RegExp(phonoRule.matchPattern, 'g');
                        currentResult = currentResult.replace(regex, phonoRule.replacement);
                    } else {
                        currentResult = currentResult.split(phonoRule.matchPattern).join(phonoRule.replacement);
                    }
                } catch (e) {
                    console.error(`Error applying phonological rule ${phonoRule.name}:`, e);
                }
            }
            return { ...form, result: currentResult };
        });
    }

    return forms;
};
