import Navbar from './Navbar';

export const PageLayout = (props: { children: React.ReactNode }) => {
    /**
     * Most applications will need to conditionally render certain components based on whether a user is signed in or not.
     * msal-react provides 2 easy ways to do this. AuthenticatedTemplate and UnauthenticatedTemplate components will
     * only render their children if a user is authenticated or unauthenticated, respectively.
     */
    return (
        <>
            <Navbar />
            {props.children}
            <footer className="text-center text-gray-500 py-8">
                <center>
                    How did we do?
                    <a
                        href="https://forms.office.com/Pages/ResponsePage.aspx?id=v4j5cvGGr0GRqy180BHbR_ivMYEeUKlEq8CxnMPgdNZUNDlUTTk2NVNYQkZSSjdaTk5KT1o4V1VVNS4u"
                        rel="noopener noreferrer"
                        target="_blank"
                        className="text-primary-500 hover:text-primary-600 ml-1"
                    >
                        {' '}
                        Share your experience!
                    </a>
                </center>
            </footer>
        </>
    );
};
