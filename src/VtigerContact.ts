const nameKeyMap = {
    license: "cf_1260",
    status: "cf_1038",
    leadSource: "cf_1268",
    registrationDate: "cf_1386",
    referrerName: "cf_1854",
    referrerType: "cf_1852",
    promoCode: "cf_contacts_promocode"
};

export interface VtigerContact {
    email: string;
    lastname?: string;
    license?: string;
    status?: string;
    leadSource?: string;
    registrationDate?: Date;
    referrerName?: string;
    referrerType?: string;
    promoCode?: string;
}

export function translateNamesToKeys(contact: VtigerContact) {
    return (<any>Object).assign(
        {},
        ...Object.keys(contact).map(key => ({
            [nameKeyMap[key] || key]: contact[key].toString()
        }))
    );
}
