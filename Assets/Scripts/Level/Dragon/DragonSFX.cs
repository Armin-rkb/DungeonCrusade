using UnityEngine;
using System.Collections;

public class DragonSFX : MonoBehaviour
{

    [SerializeField]
    private WakeDragonAnim _wakeDragonAnim;

    [SerializeField]
    private AudioSource _wakeDragonSFX;

    [SerializeField]
    private AudioSource _enterDragonSFX;

    void Awake()
    {
        _wakeDragonAnim.OnDragonAwakeSound += PlayAwakeSFX;
        _wakeDragonAnim.OnDragonEnter += PlayEnterSFX;
    }

    void PlayAwakeSFX()
    {
        _wakeDragonSFX.Play();
    }

    void PlayEnterSFX()
    {
        _enterDragonSFX.Play();
    }
}