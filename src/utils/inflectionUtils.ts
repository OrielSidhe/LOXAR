
import { InflectionProfile, InflectionParadigm, InflectionRule, LexiconEntry } from '../types';

export interface InflectedForm {
    name: string;
    result: string;
}

export const filterParadigmsForFunction = (paradigms: InflectionParadigm[], targetCategory: string): InflectionParadigm[] => {
    if (!paradigms) return [];
    const results: InflectionParadigm[] = [];
    for (const paradigm of paradigms) {
        const applies = !paradigm.appliesTo || paradigm.appliesTo.length === 0 || paradigm.appliesTo.includes(targetCategory);
        const filteredSubParadigms = paradigm.paradigms ? filterParadigmsForFunction(paradigm.paradigms, targetCategory) : [];
        if (applies || filteredSubParadigms.length > 0) {
            results.push({ ...paradigm, paradigms: filteredSubParadigms });
        }
    }
    return results;
};

export const generateInflections = (entry: LexiconEntry, paradigm: InflectionParadigm, profile: InflectionProfile): InflectedForm[] => {
    if (!entry || !paradigm) return [];

    const baseLexeme = (entry.Léxema[0] || entry.Raíz).replace(/-$/, '');

    const applyRule = (rule: InflectionRule): InflectedForm => {
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

    const getAllRules = (p: InflectionParadigm): InflectedForm[] => [
        ...p.rules.map(applyRule),
        ...(p.paradigms?.flatMap(getAllRules) || [])
    ];

    let forms = getAllRules(paradigm);

    // Apply Phonological Rules
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
