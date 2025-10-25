import { Table } from 'react-bootstrap';

export const IdTokenData = (props: { idTokenClaims: any }) => {
    const tokenClaims = createClaimsTable(props.idTokenClaims);

    const tableRow = Object.keys(tokenClaims).map((key, index) => {
        return (
            <tr key={key}>
                {tokenClaims[key].map((claimItem: any) => (
                    <td key={claimItem}>{claimItem}</td>
                ))}
            </tr>
        );
    });
    
    return (
        <>
            <div className="data-area-div">
                <p>
                    See below the claims in your <strong> ID token </strong>. For more information, visit:{' '}
                    <span>
                        <a href="https://docs.microsoft.com/en-us/azure/active-directory/develop/id-tokens#claims-in-an-id-token">
                            docs.microsoft.com
                        </a>
                    </span>
                </p>
                <div className="data-area-div">
                    <Table responsive striped bordered hover>
                        <thead>
                            <tr>
                                <th>Claim</th>
                                <th>Value</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>{tableRow}</tbody>
                    </Table>
                </div>
            </div>
        </>
    );
};

const createClaimsTable = (idTokenClaims: any) => {
    const claimsTable: { [key: string]: string[] } = {};
    
    if (idTokenClaims) {
        Object.keys(idTokenClaims).forEach((key) => {
            claimsTable[key] = [
                key,
                idTokenClaims[key]?.toString() || '',
                getClaimDescription(key)
            ];
        });
    }
    
    return claimsTable;
};

const getClaimDescription = (claim: string): string => {
    const descriptions: { [key: string]: string } = {
        'aud': 'Audience - The intended recipient of the token',
        'iss': 'Issuer - The entity that issued the token',
        'iat': 'Issued At - When the token was issued',
        'nbf': 'Not Before - The token is not valid before this time',
        'exp': 'Expiration - When the token expires',
        'aio': 'Azure internal claim',
        'azp': 'Authorized party - The party to which the token was issued',
        'azpacr': 'Authorized party authentication method',
        'oid': 'Object ID - The unique identifier for the user',
        'sub': 'Subject - The principal about which the token asserts information',
        'tid': 'Tenant ID - The unique identifier of the tenant',
        'uti': 'Unique token identifier',
        'rh': 'Refresh token hash',
        'ver': 'Version - The version of the token',
        'preferred_username': 'Preferred username - The username the user prefers to use',
        'name': 'Name - The display name of the user',
        'email': 'Email - The email address of the user',
        'given_name': 'Given name - The first name of the user',
        'family_name': 'Family name - The last name of the user'
    };
    
    return descriptions[claim] || 'Custom claim';
};
