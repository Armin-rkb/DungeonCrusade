using UnityEngine;
using System.Collections;

public class WakeDragonAnim : MonoBehaviour {

    public delegate void DragonSoundEventHandler();
    public DragonSoundEventHandler OnDragonAwakeSound;

    public delegate void DragonEnterEventHandler();
    public DragonEnterEventHandler OnDragonEnter;

    [SerializeField]
    private TempleBombDetection _bombDestruction;
    [SerializeField]
    private Animator _dragonAnimator;

    void Awake()
    {
        _bombDestruction.OnBombExplosion += WakeDragon;
    }

    void WakeDragon()
    {
        StartCoroutine("WakeCoroutine");
    }

    IEnumerator WakeCoroutine()
    {
        yield return new WaitForSeconds(3);
        _dragonAnimator.SetBool("DragonAwake", true);

        if (OnDragonAwakeSound != null)
        OnDragonAwakeSound();

        yield return new WaitForSeconds(3);
        _dragonAnimator.SetBool("DragonFly", true);

        yield return new WaitForSeconds(3);

        if (OnDragonEnter != null)
            OnDragonEnter();
    }
}
