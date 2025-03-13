import { t, Trans } from '@lingui/macro';
import { Button, Segmented, Tooltip } from 'antd';
import React from 'react';

import logo from 'src/images/logo.svg';
import { authClientConfigMap, ClientID, type SharedCredentials } from 'src/services/auth';

import { SignInProps, useSignIn } from './hooks';
import s from './SignIn.module.scss';
import { S } from './SignIn.styles';

// import {AppFooter} from '@beda.software/emr/dist/components/BaseLayout/Footer';

interface SharedCredentialsProps {
    sharedCredentials: SharedCredentials;
}

function SharedCredentials(props: SharedCredentialsProps) {
    const { sharedCredentials } = props;

    return (
        <S.CredentialsWrapper>
            <S.CredentialsBlock>
                <S.CredentialLabel>{t`Username`}</S.CredentialLabel>
                <S.CredentialsList>
                    {sharedCredentials.accountDetails.map((accountDetails, index) => {
                        return (
                            <React.Fragment key={accountDetails.login}>
                                <div>
                                    <Tooltip title={t`${accountDetails.accountDescription}`}>
                                        <S.CredentialName>{accountDetails.login}</S.CredentialName>
                                    </Tooltip>
                                </div>
                                {index !== sharedCredentials.accountDetails.length - 1 ? <span>/</span> : null}
                                {accountDetails.password ? (
                                    <S.CredentialsBlock>
                                        <S.CredentialLabel>{t`Password`}</S.CredentialLabel>
                                        <S.CredentialsList>
                                            <span>{accountDetails.password}</span>
                                        </S.CredentialsList>
                                    </S.CredentialsBlock>
                                ) : null}
                            </React.Fragment>
                        );
                    })}
                </S.CredentialsList>
            </S.CredentialsBlock>
            {sharedCredentials.commonPassword ? (
                <S.CredentialsBlock>
                    <S.CredentialLabel>{t`Password`}</S.CredentialLabel>
                    <S.CredentialsList>
                        <span>password</span>
                    </S.CredentialsList>
                </S.CredentialsBlock>
            ) : null}
        </S.CredentialsWrapper>
    );
}

export function SignIn(props: SignInProps) {
    const { activeClientID, authorize, setClientID, authClientConfig } = useSignIn(props);
    console.log('authClientConfig', authClientConfig);
    return (
        <S.Container>
            <S.Form>
                <div className={s.header}>
                    <S.Text>{t`Welcome to`}</S.Text>
                    <img src={logo} alt="" />
                </div>
                <Segmented
                    value={activeClientID}
                    options={Object.values(authClientConfigMap).map((configItem) => ({
                        value: configItem.clientId,
                        label: configItem.tabTitle,
                    }))}
                    block
                    onChange={(value) => {
                        setClientID(value as ClientID);
                    }}
                    className={s.signInServiceSelectLabel}
                />
                <S.Message>
                    <b>
                        <Trans>{authClientConfig.message}</Trans>
                    </b>
                    {authClientConfig.sharedCredentials ? (
                        <SharedCredentials sharedCredentials={authClientConfig.sharedCredentials} />
                    ) : null}
                </S.Message>
                <Button type="primary" onClick={authorize} size="large">
                    {t`Log in`}
                </Button>
            </S.Form>
            {/* <AppFooter type="light" /> */}
        </S.Container>
    );
}
