import { t } from '@lingui/macro';
import { Button, Segmented, Tooltip } from 'antd';

// import { AppFooter } from '@beda.software/emr/dist/components/BaseLayout/Footer';

import logo from 'src/images/logo.svg';
import { SignInService } from 'src/services/auth';

import { SignInProps, useSignIn } from './hooks';
import s from './SignIn.module.scss';
import { S } from './SignIn.styles';

export function SignIn(props: SignInProps) {
    const { signInService, authorize, setSignInService } = useSignIn(props);

    return (
        <S.Container>
            <S.Form>
                <div className={s.header}>
                    <S.Text>{t`Welcome to`}</S.Text>
                    <img src={logo} alt="" />
                </div>
                <Segmented
                    value={signInService}
                    options={[SignInService.Aidbox, SignInService.Smile]}
                    block
                    onChange={(value) => {
                        setSignInService(value as SignInService);
                    }}
                    className={s.signInServiceSelectLabel}
                />
                {signInService === SignInService.Aidbox ? (
                    <>
                        <S.Message>
                            <b>{t`On the next page, please, use one of the following credentials`}</b>
                            <S.CredentialsWrapper>
                                <S.CredentialsBlock>
                                    <S.CredentialLabel>{t`Username`}</S.CredentialLabel>
                                    <S.CredentialsList>
                                        <div>
                                            <Tooltip title="As an admin, you have full access to settings and data">
                                                <S.CredentialName>admin</S.CredentialName>
                                            </Tooltip>
                                        </div>
                                        <span>/</span>
                                        <div>
                                            <Tooltip title="Practitioner has access to related patients">
                                                <S.CredentialName>practitioner-tc</S.CredentialName>
                                            </Tooltip>
                                        </div>
                                    </S.CredentialsList>
                                </S.CredentialsBlock>
                                <S.CredentialsBlock>
                                    <S.CredentialLabel>{t`Password`}</S.CredentialLabel>
                                    <S.CredentialsList>
                                        <span>password</span>
                                    </S.CredentialsList>
                                </S.CredentialsBlock>
                            </S.CredentialsWrapper>
                        </S.Message>
                    </>
                ) : (
                    <>
                        <S.Message>
                            <b>{t`On the next page, please, use your Smile CDR credentials`}</b>
                        </S.Message>
                    </>
                )}
                <Button type="primary" onClick={authorize} size="large">
                    {t`Log in`}
                </Button>
            </S.Form>
            {/* <AppFooter type="light" /> */}
        </S.Container>
    );
}
