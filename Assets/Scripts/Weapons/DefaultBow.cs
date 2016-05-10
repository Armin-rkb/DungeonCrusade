using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class DefaultBow : MonoBehaviour, IWeapon
{
    [SerializeField] private Arrow arrow;
    private PlayerFlip flip;
    

    void Awake()
    {
        flip = GetComponent<PlayerFlip>();
    }

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Arrow currArrow = Instantiate(arrow, new Vector2(transform.position.x + 1, transform.position.y), arrow.transform.rotation) as Arrow;
            currArrow.GetComponent<Arrow>().ShootRight();
        }
        else
        {
            Arrow currArrow = Instantiate(arrow, new Vector2(transform.position.x - 1, transform.position.y), Quaternion.Inverse(arrow.transform.rotation)) as Arrow;
            currArrow.GetComponent<Arrow>().ShootLeft();
        }
    }
}
