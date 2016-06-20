using UnityEngine;
using System.Collections;

public class DragonShake : MonoBehaviour
{

    [SerializeField]
    CameraShake _cameraShake;

    [SerializeField]
    private WakeDragonAnim _wakeDragon;

    bool _dragonShaking;

    void Awake()
    {
        _wakeDragon.OnDragonEnter += TurnShakeOn;
    }

    void TurnShakeOn()
    {
        _dragonShaking = true;
        _cameraShake.Shake(3f);
        
    }

    void Update()
    {
        if (_dragonShaking)
        {
            

            if (_cameraShake.SetShakePower >= 0.25)
            {
                _cameraShake.SetShakePower -= 0.01f;
            }
            else
                _cameraShake.SetShakePower += 0.01f;
        }
    }
}
