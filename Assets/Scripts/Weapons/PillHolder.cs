using UnityEngine;
using System.Collections;

public class PillHolder : MonoBehaviour, IWeapon
{
    [SerializeField]
    private Pill pill;
    private PlayerFlip flip;


    void Awake()
    {
        flip = GetComponent<PlayerFlip>();
    }

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Pill currPill = Instantiate(pill, new Vector2(transform.position.x + 1, transform.position.y), pill.transform.rotation) as Pill;
            currPill.GetComponent<Pill>().ShootRight();
        }
        else
        {
            Pill currPill = Instantiate(pill, new Vector2(transform.position.x - 1, transform.position.y), Quaternion.Inverse(pill.transform.rotation)) as Pill;
            currPill.GetComponent<Pill>().ShootLeft();
        }
    }
}
