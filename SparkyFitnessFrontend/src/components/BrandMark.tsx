import { CardTitle } from '@/components/ui/card';

/** DG FIT logo and wordmark for the sign-in style cards. */
const BrandMark = () => (
  <>
    <img
      src="/images/dgfit-logo.png"
      alt="DG FIT"
      className="h-10 w-10 mr-2 rounded-xl"
    />
    <CardTitle className="text-2xl font-extrabold tracking-tight text-foreground">
      DG <span className="text-primary">FIT</span>
    </CardTitle>
  </>
);

export default BrandMark;
