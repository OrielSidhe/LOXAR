import { Fragment } from 'react';

interface RenderTemplateProps {
    template: string;
    token?: string;
}

/**
 * Renders a template string safely by splitting on `token` and emitting plain
 * React text nodes + an accent span, instead of dangerouslySetInnerHTML.
 *
 * This closes the HTML/script injection vector that existed when the template
 * (user/AI controlled) was injected verbatim as HTML.
 */
export const RenderTemplate = ({ template, token = '[RAÍZ]' }: RenderTemplateProps) => {
    if (!template) return null;
    const parts = template.split(token);
    return (
        <>
            {parts.map((part, i) => (
                <Fragment key={i}>
                    {part}
                    {i < parts.length - 1 && (
                        <span className="font-mono text-accent">{token}</span>
                    )}
                </Fragment>
            ))}
        </>
    );
};

export default RenderTemplate;
