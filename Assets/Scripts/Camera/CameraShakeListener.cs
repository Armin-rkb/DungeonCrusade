using UnityEngine;
using System.Collections;

public class CameraShakeListener : MonoBehaviour {

    [SerializeField] CameraShake _cameraShake;

	void Awake()
    {
        PlayerSendShake.OnStoneShake += StoneShake;
        PlayerSendShake.OnPillShake += PillShake;
        PlayerSendShake.OnShurikenShake += ShurikenShake;
        PlayerSendShake.OnHadoukenShake += HadoukenShake;
        PlayerSendShake.OnPizzaShake += PizzaShake;
        PlayerSendShake.OnBarrelShake += BarrelShake;
        PlayerSendShake.OnSockShake += SockShake;
        PlayerSendShake.OnDuckShake += DuckShake;
        PlayerSendShake.OnBombShake += BombShake;
        PlayerSendShake.OnMusicShake += MusicShake;
    }
	

    void StoneShake(PlayerSendShake player)
    {
        _cameraShake.Shake(0.20f);
        _cameraShake.SetShakePower = 0.025f;
    }

    void PillShake(PlayerSendShake player)
    {
        _cameraShake.Shake(0.20f);
        _cameraShake.SetShakePower = 0.04f;
    }

    void ShurikenShake(PlayerSendShake player)
    {
        _cameraShake.Shake(0.10f);
        _cameraShake.SetShakePower = 0.025f;
    }

    void HadoukenShake(PlayerSendShake player)
    {
        _cameraShake.Shake(0.25f);
        _cameraShake.SetShakePower = 0.06f;
    }

    void PizzaShake(PlayerSendShake player)
    {
        _cameraShake.Shake(0.8f);
        _cameraShake.SetShakePower = 0.08f;
    }

    void BarrelShake(PlayerSendShake player)
    {
        _cameraShake.Shake(0.35f);
        _cameraShake.SetShakePower = 0.06f;
    }

    void SockShake(PlayerSendShake player)
    {
        _cameraShake.Shake(0.30f);
        _cameraShake.SetShakePower = 0.07f;
    }

    void DuckShake(PlayerSendShake player)
    {
        _cameraShake.Shake(0.30f);
        _cameraShake.SetShakePower = 0.06f;
    }

    void BombShake(PlayerSendShake player)
    {
        _cameraShake.Shake(1f);
        _cameraShake.SetShakePower = 0.1f;
    }

    void MusicShake(PlayerSendShake player)
    {
        _cameraShake.Shake(0.10f);
        _cameraShake.SetShakePower = 0.025f;
    }
}
