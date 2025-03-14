import { t, Trans } from '@lingui/macro';
import { Button, Segmented, Tooltip } from 'antd';
import React, { useCallback, useMemo } from 'react';
import { SingleValue } from 'react-select';

import { Select } from '@beda.software/emr/components';

import logo from 'src/images/logo.svg';
import { authClientConfigMap, ClientID, type SharedCredentials } from 'src/services/auth';

import { SignInProps, useSignIn } from './hooks';
import s from './SignIn.module.scss';
import { S } from './SignIn.styles';

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

interface ProvidersSelectProps {
    defaultProvider: ClientID;
    onChange: (clientId: ClientID) => void;
}

interface ProviderSelectItem {
    value: ClientID;
    label: string;
}

function ProvidersSelect(props: ProvidersSelectProps) {
    const options: ProviderSelectItem[] = Object.values(authClientConfigMap).map((configItem) => ({
        value: configItem.clientId,
        label: configItem.tabTitle,
    }));

    const defaultValue = useMemo(
        () => options.find((item) => item.value === props.defaultProvider),
        [options, props.defaultProvider],
    );

    const onChange = useCallback(
        (selectedItem: SingleValue<ProviderSelectItem>) => {
            if (selectedItem) {
                props.onChange(selectedItem.value);
            }
        },
        [props],
    );

    return (
        <Select<ProviderSelectItem>
            options={options}
            defaultValue={defaultValue}
            onChange={(selectedItem) => {
                // TODO: IsMulti generic should be defined to resolve selectedItem type correctly
                // https://react-select.com/typescript#select-generics
                onChange(selectedItem as SingleValue<ProviderSelectItem>);
            }}
        />
    );
}

export function SignIn(props: SignInProps) {
    const { activeClientID, authorize, setClientID, authClientConfig } = useSignIn(props);

    return (
        <S.Container>
            <S.Form>
                <div className={s.header}>
                    <S.Text>{t`Welcome to`}</S.Text>
                    <img src={logo} alt="" />
                </div>
                <ProvidersSelect defaultProvider={activeClientID} onChange={setClientID} />
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
        </S.Container>
    );
}
